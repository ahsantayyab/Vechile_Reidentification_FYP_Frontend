"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card } from "../../components/ui/Card";
import { ReIDResults } from "../../components/ReIDResults";
import {
  getVideo,
  getVideoResult,
  getVideoFrames,
  FrameData,
  VideoJob,
  VideoResult,
} from "../../lib/api";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    queued: "bg-slate-800 text-slate-200",
    processing: "bg-amber-500/20 text-amber-300",
    completed: "bg-emerald-500/20 text-emerald-300",
    failed: "bg-rose-500/20 text-rose-300",
  };
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
        colors[status] ?? "bg-slate-800"
      }`}
    >
      {status}
    </span>
  );
}

function formatMs(ms: number | null): string {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatTime(seconds: number): string {
  if (seconds < 0.1) return `${(seconds * 1000).toFixed(0)}ms`;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${s}s`;
}

// ── Plate Badge ───────────────────────────────────────────────────────────────

function PlateBadge({ plate }: { plate: string | null | undefined }) {
  if (!plate) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded border border-amber-500/40 bg-amber-500/15 px-1.5 py-0.5 font-mono text-[11px] font-bold text-amber-200">
      🪪 {plate}
    </span>
  );
}

// ── Frames Modal ──────────────────────────────────────────────────────────────

function FramesModal({
  jobId,
  onClose,
}: {
  jobId: number;
  onClose: () => void;
}) {
  const [frames, setFrames] = useState<FrameData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<FrameData | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [plateFilter, setPlateFilter] = useState(false);

  useEffect(() => {
    getVideoFrames(jobId)
      .then(setFrames)
      .catch(() => setFrames([]))
      .finally(() => setLoading(false));
  }, [jobId]);

  const vehicleIds = [
    "all",
    ...Array.from(new Set(frames.map((f) => f.vehicle_id ?? "unknown"))),
  ];

  let filtered = filter === "all" ? frames : frames.filter((f) => f.vehicle_id === filter);
  if (plateFilter) filtered = filtered.filter((f) => f.plate_number);

  const platesCount = frames.filter((f) => f.plate_number).length;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div
        className="relative z-10 flex h-[90vh] w-full max-w-5xl flex-col rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-50">
              Processed Frames
            </h2>
            <p className="text-xs text-slate-400">
              {frames.length} detection snapshots ·{" "}
              <span className="text-amber-400">{platesCount} with plates</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Plate filter toggle */}
            {platesCount > 0 && (
              <button
                onClick={() => setPlateFilter(!plateFilter)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  plateFilter
                    ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                🪪 Plates only
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Vehicle filter tabs */}
        <div className="flex gap-2 overflow-x-auto border-b border-slate-800 px-6 py-3">
          {vehicleIds.map((vid) => (
            <button
              key={vid}
              onClick={() => setFilter(vid)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition ${
                filter === vid
                  ? "bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/40"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              {vid === "all" ? "All vehicles" : vid}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">
              No frames found.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {filtered.map((frame, i) => (
                <button
                  key={i}
                  onClick={() => setSelected(frame)}
                  className="group relative overflow-hidden rounded-xl border border-slate-700 bg-slate-800 transition hover:border-indigo-500/60 hover:shadow-lg hover:shadow-indigo-950/30"
                >
                  {/* Plate indicator ribbon */}
                  {frame.plate_number && (
                    <div className="absolute left-0 right-0 top-0 z-10 bg-amber-500/80 px-2 py-0.5 text-center font-mono text-[10px] font-bold text-black">
                      🪪 {frame.plate_number}
                    </div>
                  )}

                  <div className="aspect-video w-full overflow-hidden bg-slate-900">
                    <img
                      src={frame.url}
                      alt={`Frame at ${formatTime(frame.timestamp)}`}
                      className="h-full w-full object-cover transition group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='60'%3E%3Crect fill='%231e293b' width='100' height='60'/%3E%3Ctext fill='%2364748b' font-size='10' x='50' y='35' text-anchor='middle'%3ENo image%3C/text%3E%3C/svg%3E";
                      }}
                    />
                  </div>
                  <div className="p-2 text-left">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] font-semibold text-indigo-300">
                        {frame.vehicle_id ?? "—"}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {formatTime(frame.timestamp)}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[10px] text-slate-500">
                      conf: {(frame.confidence * 100).toFixed(0)}%
                      {frame.plate_confidence > 0 && (
                        <span className="ml-1.5 text-amber-500/80">
                          · plate: {(frame.plate_confidence * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {selected && (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center bg-black/90"
          onClick={() => setSelected(null)}
        >
          <div className="max-h-[85vh] max-w-3xl overflow-hidden rounded-xl border border-slate-700">
            <img
              src={selected.url}
              alt="Detection"
              className="max-h-[80vh] object-contain"
            />
            <div className="flex items-center justify-between bg-slate-900 px-4 py-2.5 text-xs text-slate-400">
              <span className="flex items-center gap-2">
                <span className="font-mono font-semibold text-indigo-300">
                  {selected.vehicle_id ?? "Unknown"}
                </span>
                ·
                <span>{formatTime(selected.timestamp)}</span>
                {selected.plate_number && (
                  <PlateBadge plate={selected.plate_number} />
                )}
              </span>
              <span>
                Vehicle conf: {(selected.confidence * 100).toFixed(1)}%
                {selected.plate_confidence > 0 &&
                  ` · Plate conf: ${(selected.plate_confidence * 100).toFixed(1)}%`}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Analysis Summary ──────────────────────────────────────────────────────────

function AnalysisSummary({
  result,
  jobId,
}: {
  result: VideoResult;
  jobId: number;
}) {
  const [showFrames, setShowFrames] = useState(false);
  const metrics = result.metrics ?? {};

  const cards = [
    {
      key: "frames_processed",
      label: "Frames",
      icon: "🎞️",
      clickable: true,
      color: "text-indigo-300",
    },
    {
      key: "detections",
      label: "Detections",
      icon: "🚗",
      clickable: false,
      color: "text-amber-300",
    },
    {
      key: "unique_vehicles",
      label: "Unique Vehicles",
      icon: "🔍",
      clickable: false,
      color: "text-emerald-300",
    },
    {
      key: "plates_detected",
      label: "Plates Read",
      icon: "🪪",
      clickable: false,
      color: "text-cyan-300",
    },
    {
      key: "elapsed_sec",
      label: "Elapsed",
      icon: "⏱️",
      clickable: false,
      color: "text-slate-300",
    },
  ];

  return (
    <>
      <Card title="Analysis Summary">
        <p className="mb-4 text-sm text-slate-300">{result.summary}</p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {cards.map(({ key, label, icon, clickable, color }) => (
            <div
              key={key}
              onClick={clickable ? () => setShowFrames(true) : undefined}
              className={`rounded-xl border bg-slate-800/60 px-3 py-3 text-center transition ${
                clickable
                  ? "cursor-pointer border-indigo-500/30 hover:border-indigo-400/60 hover:bg-slate-800 hover:shadow-md"
                  : "border-slate-700"
              }`}
            >
              <div className="mb-1 text-lg">{icon}</div>
              <div className={`text-xl font-bold ${color}`}>
                {String(metrics[key] ?? "—")}
              </div>
              <div className="mt-0.5 text-[11px] text-slate-400">{label}</div>
              {clickable && (
                <div className="mt-1 text-[10px] text-indigo-400/70">
                  click to view →
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Models Used */}
        <div className="mt-4 rounded-xl border border-slate-700 bg-slate-800/40 p-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Models Used
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                color: "amber",
                icon: "👁️",
                name: "YOLOv8n",
                desc: "Vehicle detection",
                sub: "car, bus, truck, moto",
              },
              {
                color: "indigo",
                icon: "🧠",
                name: "TransReID",
                desc: "Re-identification",
                sub: "ResNet50 + Transformer",
              },
              {
                color: "cyan",
                icon: "🪪",
                name: "PlateNet",
                desc: "Number plate OCR",
                sub: "YOLOv8 fine-tuned",
              },
            ].map(({ color, icon, name, desc, sub }) => (
              <div key={name} className="flex items-start gap-2.5">
                <div
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-${color}-500/10 ring-1 ring-${color}-500/30 text-sm`}
                >
                  {icon}
                </div>
                <div>
                  <div className={`text-xs font-semibold text-${color}-300`}>
                    {name}
                  </div>
                  <div className="text-[11px] text-slate-500">{desc}</div>
                  <div className="text-[11px] text-slate-500">{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {showFrames && (
        <FramesModal jobId={jobId} onClose={() => setShowFrames(false)} />
      )}
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function VideoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const jobId = Number(id);

  const [job, setJob] = useState<VideoJob | null>(null);
  const [result, setResult] = useState<VideoResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;
    const load = async () => {
      try {
        const jobData = await getVideo(jobId);
        setJob(jobData);
        if (jobData.status === "completed") {
          try {
            setResult(await getVideoResult(jobId));
          } catch {}
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load job.");
      } finally {
        setLoading(false);
      }
    };
    load();

    const interval = setInterval(async () => {
      try {
        const jobData = await getVideo(jobId);
        setJob(jobData);
        if (jobData.status === "completed" || jobData.status === "failed") {
          clearInterval(interval);
          if (jobData.status === "completed") {
            setResult(await getVideoResult(jobId));
          }
        }
      } catch {
        clearInterval(interval);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [jobId]);

  if (loading)
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-slate-400">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
        Loading…
      </div>
    );

  if (error || !job)
    return (
      <Card>
        <p className="text-sm text-rose-400">{error ?? "Job not found."}</p>
        <Link
          href="/videos"
          className="mt-2 block text-xs text-indigo-300 hover:underline"
        >
          ← Back to history
        </Link>
      </Card>
    );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/videos"
            className="text-xs text-slate-400 hover:text-slate-200"
          >
            ← Analysis history
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-slate-50">
            {job.title}
          </h1>
          <p className="text-xs text-slate-500">
            Job #{job.id} · {new Date(job.created_at).toLocaleString()}
            {job.camera_name && (
              <span className="ml-2 text-indigo-400">📍 {job.camera_name}</span>
            )}
          </p>
        </div>
        <StatusBadge status={job.status} />
      </div>

      {/* Camera location info */}
      {job.camera_lat && job.camera_lng && (
        <div className="flex items-center gap-2 rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-4 py-2.5 text-sm text-indigo-300">
          <span>📍</span>
          <span className="font-medium">
            {job.camera_name || "Camera Location"}
          </span>
          <span className="font-mono text-xs text-indigo-400/70">
            ({job.camera_lat.toFixed(4)}, {job.camera_lng.toFixed(4)})
          </span>
        </div>
      )}

      {/* Progress bar */}
      {job.status !== "completed" && job.status !== "failed" && (
        <Card title="Processing">
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-slate-400">
              <span>
                {job.status === "queued"
                  ? "Waiting in queue…"
                  : "Analyzing video + detecting plates…"}
              </span>
              <span>{job.progress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-indigo-400 transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.max(0, job.progress))}%`,
                }}
              />
            </div>
          </div>
        </Card>
      )}

      {job.status === "failed" && (
        <Card title="Processing Failed">
          <p className="text-sm text-rose-400">
            {job.error_message ?? "An unknown error occurred."}
          </p>
        </Card>
      )}

      {/* Job Details */}
      <Card title="Job Details">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
          {[
            { label: "File", value: job.original_filename },
            { label: "Status", value: job.status },
            { label: "Duration", value: formatMs(job.duration_ms) },
            { label: "Created", value: new Date(job.created_at).toLocaleString() },
            { label: "Updated", value: new Date(job.updated_at).toLocaleString() },
            ...(job.description ? [{ label: "Notes", value: job.description }] : []),
          ].map(({ label, value }) => (
            <div key={label}>
              <dt className="text-xs text-slate-500">{label}</dt>
              <dd className="mt-0.5 truncate text-slate-200">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      {/* Analysis Summary */}
      {result && <AnalysisSummary result={result} jobId={jobId} />}

      {/* Re-ID Results */}
      {job.status === "completed" && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-100">
            Re-Identification Results
          </h2>
          <ReIDResults jobId={jobId} />
        </div>
      )}
    </div>
  );
}