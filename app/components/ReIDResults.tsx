"use client";

import { useEffect, useState, Fragment } from "react";
import Link from "next/link";
import { Card } from "./ui/Card";
import { TrajectoryRoadMap, Waypoint } from "./TrajectoryRoadMap";
import { FeaturePanel, FeatureStats, SimilarityNeighbor } from "./FeaturePanel";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface Props {
  jobId: number;
}

interface ReIDGroup {
  vehicle_id: string;
  detection_count: number;
  best_score: number;
  first_seen: number;
  last_seen: number;
  plate_number: string | null;
  feature_stats?: FeatureStats;
  similarity_to_others?: SimilarityNeighbor[];
}

interface CameraInfo {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

interface ReIDData {
  job_id: number;
  unique_vehicles: number;
  reid_groups: ReIDGroup[];
  trajectory: {
    camera_a: CameraInfo | null;
    camera_b: CameraInfo | null;
    vehicle_paths: any[];
    total_vehicles: number;
    reidentified_across_cameras: number;
  };
  summary: string;
  plates_detected: number;
  cross_video_matches: Record<string, Waypoint[]>;
  has_cross_video_match: boolean;
}

function formatTime(seconds: number): string {
  if (seconds < 0.1) return `${(seconds * 1000).toFixed(0)}ms`;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${s}s`;
}

function ScoreBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color =
    pct >= 85
      ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30"
      : pct >= 70
      ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30"
      : "bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/30";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${color}`}>{pct}%</span>
  );
}

function PlateBadge({ plate }: { plate: string | null }) {
  if (!plate) {
    return (
      <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[11px] font-mono text-slate-500">—</span>
    );
  }
  return (
    <Link
      href={`/trajectories?plate=${encodeURIComponent(plate)}`}
      className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[12px] font-mono font-semibold text-amber-200 transition hover:border-amber-400 hover:bg-amber-500/20"
    >
      <span className="text-[10px]">🪪</span>
      {plate}
    </Link>
  );
}

export function ReIDResults({ jobId }: Props) {
  const [data, setData] = useState<ReIDData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedVehicle, setExpandedVehicle] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/v1/videos/${jobId}/reid`)
      .then((r) => r.json())
      .then((r) => setData(r.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [jobId]);

  if (loading) {
    return (
      <Card title="Re-Identification Results">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
          Loading Re-ID results…
        </div>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card title="Re-Identification Results">
        <p className="text-sm text-rose-400">{error ?? "No data"}</p>
      </Card>
    );
  }

  const { reid_groups, trajectory, unique_vehicles, plates_detected, cross_video_matches, has_cross_video_match } = data;

  let mapWaypoints: Waypoint[] = [];
  let displayedPlate: string | undefined;

  if (has_cross_video_match) {
    const firstPlate = Object.keys(cross_video_matches)[0];
    displayedPlate = firstPlate;
    mapWaypoints = (cross_video_matches[firstPlate] || []).map((w) => ({
      ...w,
      thumbnail_url: w.thumbnail_url
        ? w.thumbnail_url.startsWith("http")
          ? w.thumbnail_url
          : `${API_BASE}${w.thumbnail_url}`
        : null,
    }));
  } else if (trajectory?.camera_a) {
    mapWaypoints = [{
      video_id: jobId,
      title: trajectory.camera_a.name,
      lat: trajectory.camera_a.lat,
      lng: trajectory.camera_a.lng,
      name: trajectory.camera_a.name,
      uploaded_at: null,
      first_seen_in_video: 0,
      last_seen_in_video: 0,
      detection_count: reid_groups.reduce((s, g) => s + g.detection_count, 0),
      vehicle_id: null,
      thumbnail_url: null,
    }];
  }

  return (
    <div className="space-y-4">
      {/* ── Summary stats ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: "Unique Vehicles", value: unique_vehicles, color: "text-indigo-300" },
          { label: "Re-Identified", value: Object.keys(cross_video_matches || {}).length, color: "text-emerald-300" },
          {
            label: "Detections",
            value: reid_groups.reduce((a, g) => a + g.detection_count, 0),
            color: "text-amber-300",
          },
          {
            label: "Plates Read",
            value: plates_detected ?? reid_groups.filter((g) => g.plate_number).length,
            color: "text-cyan-300",
          },
          {
            label: "Avg Similarity",
            value:
              reid_groups.length > 0
                ? `${Math.round(
                    (reid_groups.reduce((a, g) => a + g.best_score, 0) / reid_groups.length) * 100
                  )}%`
                : "—",
            color: "text-slate-300",
          },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-slate-700 bg-slate-800/60 p-4 text-center">
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            <div className="mt-1 text-xs text-slate-400">{label}</div>
          </div>
        ))}
      </div>

      {/* ── Map ── */}
      {mapWaypoints.length > 0 && (
        <Card title={
          has_cross_video_match
            ? `🛣️ Cross-Camera Trajectory — 🪪 ${displayedPlate}`
            : "📍 Camera Location"
        }>
          {has_cross_video_match ? (
            <p className="mb-3 text-xs text-slate-400">
              This vehicle was re-identified in <span className="font-semibold text-emerald-300">{mapWaypoints.length} cameras</span>.
              Real road path drawn between camera locations using OpenStreetMap routing.
            </p>
          ) : (
            <p className="mb-3 text-xs text-slate-400">
              Camera pinned on upload. Upload another video with the same vehicle plate to see cross-camera trajectory.
            </p>
          )}
          <TrajectoryRoadMap
            waypoints={mapWaypoints}
            plateNumber={displayedPlate}
            height={has_cross_video_match ? "h-[420px]" : "h-72"}
          />
        </Card>
      )}

      {!mapWaypoints.length && (
        <Card title="Camera Location">
          <p className="text-xs text-slate-500">
            No camera location was pinned for this video. Re-upload with a map pin to enable trajectory tracking.
          </p>
        </Card>
      )}

      {/* ── Vehicle Groups Table — now with expandable rows ── */}
      <Card title={`Detected Vehicles (${reid_groups.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-left text-xs text-slate-400">
                <th className="pb-2 pr-2 w-8 font-medium"></th>
                <th className="pb-2 pr-4 font-medium">Vehicle</th>
                <th className="pb-2 pr-4 font-medium">Number Plate</th>
                <th className="pb-2 pr-4 font-medium">Detections</th>
                <th className="pb-2 pr-4 font-medium">First Seen</th>
                <th className="pb-2 pr-4 font-medium">Last Seen</th>
                <th className="pb-2 pr-4 font-medium">Similarity</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {reid_groups.map((group) => {
                const plate = group.plate_number;
                const isCrossCamera = !!(plate && cross_video_matches?.[plate.toUpperCase().trim()]);
                const isExpanded = expandedVehicle === group.vehicle_id;
                const hasFeatureStats = !!group.feature_stats;

                return (
                  <Fragment key={group.vehicle_id}>
                    <tr
                      onClick={() =>
                        hasFeatureStats &&
                        setExpandedVehicle(isExpanded ? null : group.vehicle_id)
                      }
                      className={`text-slate-300 transition ${
                        hasFeatureStats
                          ? "cursor-pointer hover:bg-slate-800/60"
                          : "hover:bg-slate-800/40"
                      } ${isExpanded ? "bg-slate-800/60" : ""}`}
                    >
                      <td className="py-2.5 pr-2 text-center">
                        {hasFeatureStats && (
                          <span
                            className={`inline-block transition-transform ${
                              isExpanded ? "rotate-90" : ""
                            } text-slate-500`}
                          >
                            ▶
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 pr-4">
                        <span className="font-mono font-semibold text-indigo-300">
                          {group.vehicle_id}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4" onClick={(e) => e.stopPropagation()}>
                        <PlateBadge plate={plate} />
                      </td>
                      <td className="py-2.5 pr-4 tabular-nums">{group.detection_count}</td>
                      <td className="py-2.5 pr-4 tabular-nums text-slate-400">{formatTime(group.first_seen)}</td>
                      <td className="py-2.5 pr-4 tabular-nums text-slate-400">{formatTime(group.last_seen)}</td>
                      <td className="py-2.5 pr-4">
                        <ScoreBadge score={group.best_score} />
                      </td>
                      <td className="py-2.5" onClick={(e) => e.stopPropagation()}>
                        {isCrossCamera ? (
                          <Link
                            href={`/trajectories?plate=${encodeURIComponent(plate!)}`}
                            className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] text-emerald-300 ring-1 ring-emerald-500/20 hover:bg-emerald-500/30"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            Cross-camera ↗
                          </Link>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-700 px-2 py-0.5 text-[11px] text-slate-400">
                            Single camera
                          </span>
                        )}
                      </td>
                    </tr>
                    {/* Expanded row: feature panel */}
                    {isExpanded && group.feature_stats && (
                      <tr key={`${group.vehicle_id}-features`}>
                        <td colSpan={8} className="bg-slate-900/50 px-2 py-3">
                          <FeaturePanel
                            vehicleId={group.vehicle_id}
                            stats={group.feature_stats}
                            neighbors={group.similarity_to_others || []}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 space-y-2">
          {reid_groups.some((g) => g.feature_stats) && (
            <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 px-3 py-2 text-xs text-indigo-300">
              <span className="font-semibold">🧠 Click any row</span> to inspect the
              512-dimensional feature vector extracted by TransReID for that vehicle.
            </div>
          )}
          {reid_groups.some((g) => g.plate_number) && (
            <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-3 py-2 text-xs text-cyan-400">
              <span className="font-semibold">🪪 Plate-assisted Re-ID:</span> Click any plate to see its
              cross-camera trajectory. Plates detected in 2+ videos automatically link to the trajectory map.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}