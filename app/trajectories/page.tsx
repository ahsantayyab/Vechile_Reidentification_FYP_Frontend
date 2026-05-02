"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "../components/ui/Card";
import { TrajectoryRoadMap, Waypoint } from "../components/TrajectoryRoadMap";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface MatchedPlate {
  plate_number: string;
  camera_count: number;
  video_count: number;
  thumbnail_url: string | null;
  first_seen: string;
  last_seen: string;
}

export default function TrajectoriesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedPlate = searchParams.get("plate");

  const [plates, setPlates] = useState<MatchedPlate[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [loadingTrajectory, setLoadingTrajectory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load list of plates seen in 2+ cameras
  useEffect(() => {
    fetch(`${API_BASE}/api/v1/trajectories`)
      .then((r) => r.json())
      .then((d) => setPlates(d.data?.plates ?? []))
      .catch(() => setError("Could not load trajectories"))
      .finally(() => setLoadingList(false));
  }, []);

  // Load waypoints when a plate is selected
  useEffect(() => {
    if (!selectedPlate) {
      setWaypoints([]);
      return;
    }
    setLoadingTrajectory(true);
    setError(null);
    fetch(`${API_BASE}/api/v1/trajectories/${encodeURIComponent(selectedPlate)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.data?.waypoints) {
          // Make thumbnail URLs absolute
          const wps = d.data.waypoints.map((w: Waypoint) => ({
            ...w,
            thumbnail_url: w.thumbnail_url
              ? w.thumbnail_url.startsWith("http")
                ? w.thumbnail_url
                : `${API_BASE}${w.thumbnail_url}`
              : null,
          }));
          setWaypoints(wps);
        }
      })
      .catch(() => setError("Could not load trajectory"))
      .finally(() => setLoadingTrajectory(false));
  }, [selectedPlate]);

  const onSelectPlate = (plate: string) => {
    router.push(`/trajectories?plate=${encodeURIComponent(plate)}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-50">Vehicle Trajectories</h1>
        <p className="mt-1 text-sm text-slate-400">
          Vehicles re-identified across multiple cameras. Click a plate to see the full road journey.
        </p>
      </div>

      {/* Plate list */}
      <Card title={`Matched Vehicles (${plates.length})`}>
        {loadingList ? (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
            Loading…
          </div>
        ) : plates.length === 0 ? (
          <div className="space-y-2 py-4 text-center">
            <div className="text-3xl">🔍</div>
            <p className="text-sm text-slate-300">No cross-camera matches yet</p>
            <p className="text-xs text-slate-500">
              Upload videos from at least 2 different camera locations.
              <br />
              When the same vehicle plate appears in multiple videos, it will show here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {plates.map((p) => {
              const isSelected = p.plate_number === selectedPlate;
              return (
                <button
                  key={p.plate_number}
                  onClick={() => onSelectPlate(p.plate_number)}
                  className={`group flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                    isSelected
                      ? "border-indigo-500/60 bg-indigo-500/10 shadow-lg shadow-indigo-950/30"
                      : "border-slate-700 bg-slate-800/40 hover:border-slate-600 hover:bg-slate-800/60"
                  }`}
                >
                  {p.thumbnail_url && (
                    <div className="h-14 w-20 shrink-0 overflow-hidden rounded-md bg-slate-700">
                      <img
                        src={
                          p.thumbnail_url.startsWith("http")
                            ? p.thumbnail_url
                            : `${API_BASE}${p.thumbnail_url}`
                        }
                        alt={p.plate_number}
                        className="h-full w-full object-cover transition group-hover:scale-105"
                      />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 font-mono text-sm font-bold text-amber-200">
                        🪪 {p.plate_number}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      Seen across <span className="font-semibold text-emerald-300">{p.camera_count} cameras</span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {new Date(p.first_seen).toLocaleDateString()} – {new Date(p.last_seen).toLocaleDateString()}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {/* Selected trajectory map */}
      {selectedPlate && (
        <Card title={`Journey: 🪪 ${selectedPlate}`}>
          {loadingTrajectory ? (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
              Loading trajectory…
            </div>
          ) : error ? (
            <p className="text-sm text-rose-400">{error}</p>
          ) : waypoints.length > 0 ? (
            <TrajectoryRoadMap waypoints={waypoints} plateNumber={selectedPlate} />
          ) : (
            <p className="text-sm text-slate-500">No waypoints found.</p>
          )}
        </Card>
      )}
    </div>
  );
}