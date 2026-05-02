export type ProcessingStatus = "queued" | "processing" | "completed" | "failed";

export interface VideoJobListItem {
  id: number;
  title: string;
  status: ProcessingStatus;
  progress: number;
  created_at: string;
}

export interface VideoJob extends VideoJobListItem {
  description: string | null;
  updated_at: string;
  original_filename: string;
  storage_path: string;
  error_message: string | null;
  duration_ms: number | null;
  artifact_dir: string | null;
  log_path: string | null;
  camera_lat: number | null;
  camera_lng: number | null;
  camera_name: string | null;
}

export interface VideoResultArtifact {
  filename: string;
  url: string;
}

export interface VideoResult {
  id: number;
  job_id: number;
  summary: string;
  raw_json: Record<string, unknown> | null;
  created_at: string;
  artifacts?: VideoResultArtifact[] | null;
  metrics?: Record<string, unknown> | null;
}

export interface VideoLogEntry {
  timestamp: number;
  event: string;
  message?: string;
  [key: string]: unknown;
}

// ── Camera Location ────────────────────────────────────────────────────────

export interface CameraLocation {
  lat: number;
  lng: number;
  name?: string;
}

// ── Frame data (with plate) ────────────────────────────────────────────────

export interface FrameData {
  url: string;
  timestamp: number;
  confidence: number;
  vehicle_id: string | null;
  bbox: number[];
  plate_number: string | null;
  plate_confidence: number;
}

// ── Re-ID ──────────────────────────────────────────────────────────────────

export interface ReIDGroup {
  vehicle_id: string;
  detection_count: number;
  best_score: number;
  first_seen: number;
  last_seen: number;
  plate_number: string | null;
  reidentified?: boolean;
}

export interface CameraLocationInfo {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface VehiclePath {
  vehicle_id: string;
  seen_camera_a: boolean;
  seen_camera_b: boolean;
  camera_a_time: number | null;
  camera_b_time: number | null;
  reidentified: boolean;
  plate_number: string | null;
}

export interface TrajectoryData {
  camera_a: CameraLocationInfo;
  camera_b: CameraLocationInfo;
  vehicle_paths: VehiclePath[];
  total_vehicles: number;
  reidentified_across_cameras: number;
}

export interface ReIDResult {
  job_id: number;
  unique_vehicles: number;
  reid_groups: ReIDGroup[];
  trajectory: TrajectoryData;
  summary: string;
  plates_detected: number;
}

// ── API plumbing ───────────────────────────────────────────────────────────

interface ApiErrorBody {
  code?: string;
  message?: string;
  details?: unknown;
}

interface Envelope<T> {
  data: T;
  error?: ApiErrorBody | null;
}

const BACKEND_ORIGIN = (
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"
).replace(/\/+$/, "");
const API_PREFIX = "/api/v1";

export class ApiError extends Error {
  status?: number;
  code?: string;
  details?: unknown;

  constructor(
    message: string,
    options?: { status?: number; code?: string; details?: unknown }
  ) {
    super(message);
    this.name = "ApiError";
    this.status = options?.status;
    this.code = options?.code;
    this.details = options?.details;
  }
}

function buildApiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${BACKEND_ORIGIN}${API_PREFIX}${normalized}`;
}

function makeAbsoluteUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `${BACKEND_ORIGIN}${url.startsWith("/") ? url : `/${url}`}`;
}

async function parseApiError(response: Response): Promise<ApiError> {
  let message = `Request failed with status ${response.status}`;
  let code: string | undefined;
  let details: unknown;
  try {
    const payload = await response.json();
    const detail = (payload?.detail ?? payload?.error ?? payload) as ApiErrorBody;
    if (detail?.message) message = detail.message;
    if (detail?.code) code = detail.code;
    if (detail?.details !== undefined) details = detail.details;
  } catch {}
  return new ApiError(message, { status: response.status, code, details });
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(buildApiUrl(path), { ...init, cache: "no-store" });
  if (!response.ok) throw await parseApiError(response);
  const payload = (await response.json()) as Envelope<T>;
  if (payload.error) {
    throw new ApiError(payload.error.message || "API returned an error", {
      status: response.status,
      code: payload.error.code,
      details: payload.error.details,
    });
  }
  return payload.data;
}

function normalizeArtifacts(
  artifacts: VideoResultArtifact[] | null | undefined
): VideoResultArtifact[] | null | undefined {
  if (!artifacts) return artifacts;
  return artifacts.map((a) => ({ ...a, url: makeAbsoluteUrl(a.url) }));
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) query.set(key, String(value));
  }
  return query.toString();
}

// ── Public API functions ───────────────────────────────────────────────────

export async function listVideos(params?: {
  page?: number;
  page_size?: number;
  status_filter?: ProcessingStatus;
}): Promise<VideoJobListItem[]> {
  const qs = buildQuery({
    page: params?.page,
    page_size: params?.page_size,
    status_filter: params?.status_filter,
  });
  return request<VideoJobListItem[]>(qs ? `/videos?${qs}` : "/videos");
}

export async function uploadVideo(
  formData: FormData
): Promise<VideoJob> {
  return request<VideoJob>("/videos", { method: "POST", body: formData });
}

export async function getVideo(jobId: number): Promise<VideoJob> {
  return request<VideoJob>(`/videos/${jobId}`);
}

export async function getVideoResult(jobId: number): Promise<VideoResult> {
  const result = await request<VideoResult>(`/videos/${jobId}/result`);
  return { ...result, artifacts: normalizeArtifacts(result.artifacts) };
}

export async function getVideoLogs(
  jobId: number,
  limit = 200
): Promise<VideoLogEntry[]> {
  const data = await request<{ job_id: number; entries: VideoLogEntry[] }>(
    `/videos/${jobId}/logs?limit=${limit}`
  );
  return data.entries || [];
}

export async function getVideoArtifacts(
  jobId: number
): Promise<VideoResultArtifact[]> {
  const data = await request<{ items: VideoResultArtifact[] }>(
    `/videos/${jobId}/artifacts`
  );
  return (data.items || []).map((a) => ({ ...a, url: makeAbsoluteUrl(a.url) }));
}

export async function getVideoFrames(jobId: number): Promise<FrameData[]> {
  const data = await request<{ frames: FrameData[] }>(
    `/videos/${jobId}/frames`
  );
  return (data.frames || []).map((f) => ({
    ...f,
    url: makeAbsoluteUrl(f.url),
  }));
}

export async function getReIDResult(jobId: number): Promise<ReIDResult> {
  return request<ReIDResult>(`/videos/${jobId}/reid`);
}

// Add these to your existing frontend/app/lib/api.ts at the bottom

// ── Trajectories ───────────────────────────────────────────────────────────

export interface MatchedPlate {
  plate_number: string;
  camera_count: number;
  video_count: number;
  thumbnail_url: string | null;
  first_seen: string;
  last_seen: string;
}

export interface TrajectoryWaypoint {
  video_id: number;
  title: string;
  lat: number;
  lng: number;
  name: string;
  uploaded_at: string | null;
  first_seen_in_video: number;
  last_seen_in_video: number;
  detection_count: number;
  vehicle_id: string | null;
  thumbnail_url: string | null;
}

export interface PlateTrajectory {
  plate_number: string;
  waypoints: TrajectoryWaypoint[];
  video_count: number;
  camera_count: number;
  is_cross_camera: boolean;
}

export async function listTrajectories(): Promise<MatchedPlate[]> {
  const data = await request<{ plates: MatchedPlate[]; total_plates_matched: number }>(
    "/trajectories"
  );
  return (data.plates || []).map((p) => ({
    ...p,
    thumbnail_url: p.thumbnail_url ? makeAbsoluteUrl(p.thumbnail_url) : null,
  }));
}

export async function getPlateTrajectory(plateNumber: string): Promise<PlateTrajectory> {
  const data = await request<PlateTrajectory>(
    `/trajectories/${encodeURIComponent(plateNumber)}`
  );
  return {
    ...data,
    waypoints: data.waypoints.map((w) => ({
      ...w,
      thumbnail_url: w.thumbnail_url ? makeAbsoluteUrl(w.thumbnail_url) : null,
    })),
  };
}