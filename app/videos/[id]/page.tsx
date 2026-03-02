"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Card } from "../../components/ui/Card";
import { ReIDResults } from "../../components/ReIDResults";
import { getVideo, getVideoResult, VideoJob, VideoResult } from "../../lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface FrameData {
  url: string;
  timestamp: number;
  confidence: number;
  vehicle_id: string | null;
  bbox: number[];
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    queued: "bg-slate-800 text-slate-200",
    processing: "bg-amber-500/20 text-amber-300",
    completed: "bg-emerald-500/20 text-emerald-300",
    failed: "bg-rose-500/20 text-rose-300",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status] ?? "bg-slate-800"}`}>
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

// ── Frames Modal ─────────────────────────────────────────────────────────────
function FramesModal({ jobId, onClose }: { jobId: number; onClose: () => void }) {
  const [frames, setFrames] = useState<FrameData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<FrameData | null>(null);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    fetch(`${API_BASE}/api/v1/videos/${jobId}/frames`)
      .then((r) => r.json())
      .then((d) => setFrames(d.frames ?? []))
      .catch(() => setFrames([]))
      .finally(() => setLoading(false));
  }, [jobId]);

  const vehicleIds = ["all", ...Array.from(new Set(frames.map((f) => f.vehicle_id ?? "unknown")))];
  const filtered = filter === "all" ? frames : frames.filter((f) => f.vehicle_id === filter);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div
        className="relative z-10 flex h-[90vh] w-full max-w-5xl flex-col rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-50">Processed Frames</h2>
            <p className="text-xs text-slate-400">{frames.length} detection snapshots</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filter tabs */}
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
            <p className="text-center text-sm text-slate-500 py-10">No frames found.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {filtered.map((frame, i) => (
                <button
                  key={i}
                  onClick={() => setSelected(frame)}
                  className="group relative overflow-hidden rounded-xl border border-slate-700 bg-slate-800 transition hover:border-indigo-500/60 hover:shadow-lg hover:shadow-indigo-950/30"
                >
                  <div className="aspect-video w-full overflow-hidden bg-slate-900">
                    <img
                      src={`${API_BASE}${frame.url}`}
                      alt={`Frame at ${formatTime(frame.timestamp)}`}
                      className="h-full w-full object-cover transition group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='60'%3E%3Crect fill='%231e293b' width='100' height='60'/%3E%3Ctext fill='%2364748b' font-size='10' x='50' y='35' text-anchor='middle'%3ENo image%3C/text%3E%3C/svg%3E";
                      }}
                    />
                  </div>
                  <div className="p-2 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono font-semibold text-indigo-300">
                        {frame.vehicle_id ?? "—"}
                      </span>
                      <span className="text-[10px] text-slate-500">{formatTime(frame.timestamp)}</span>
                    </div>
                    <div className="mt-0.5 text-[10px] text-slate-500">
                      conf: {(frame.confidence * 100).toFixed(0)}%
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
              src={`${API_BASE}${selected.url}`}
              alt="Detection"
              className="max-h-[85vh] object-contain"
            />
            <div className="flex items-center justify-between bg-slate-900 px-4 py-2 text-xs text-slate-400">
              <span>{selected.vehicle_id ?? "Unknown"} · {formatTime(selected.timestamp)}</span>
              <span>Confidence: {(selected.confidence * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Analysis Summary ──────────────────────────────────────────────────────────
function AnalysisSummary({ result, jobId }: { result: VideoResult; jobId: number }) {
  const [showFrames, setShowFrames] = useState(false);
  const metrics = result.metrics ?? {};

  const cards = [
    {
      key: "frames_processed",
      label: "Frames Processed",
      icon: "🎞️",
      clickable: true,
      color: "text-indigo-300",
    },
    { key: "detections", label: "Detections", icon: "🚗", clickable: false, color: "text-amber-300" },
    { key: "unique_vehicles", label: "Unique Vehicles", icon: "🔍", clickable: false, color: "text-emerald-300" },
    { key: "elapsed_sec", label: "Elapsed", icon: "⏱️", clickable: false, color: "text-slate-300" },
  ];

  return (
    <>
      <Card title="Analysis Summary">
        <p className="text-sm text-slate-300 mb-4">{result.summary}</p>

        {/* Metric cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {cards.map(({ key, label, icon, clickable, color }) => (
            <div
              key={key}
              onClick={clickable ? () => setShowFrames(true) : undefined}
              className={`rounded-xl border bg-slate-800/60 px-3 py-3 text-center transition ${
                clickable
                  ? "cursor-pointer border-indigo-500/30 hover:border-indigo-400/60 hover:bg-slate-800 hover:shadow-md hover:shadow-indigo-950/30"
                  : "border-slate-700"
              }`}
            >
              <div className="text-lg mb-1">{icon}</div>
              <div className={`text-xl font-bold ${color}`}>{String(metrics[key] ?? "—")}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">{label}</div>
              {clickable && (
                <div className="mt-1 text-[10px] text-indigo-400/70">click to view →</div>
              )}
            </div>
          ))}
        </div>

        {/* Model info */}
        <div className="mt-4 rounded-xl border border-slate-700 bg-slate-800/40 p-3">
          <div className="mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Models Used</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 ring-1 ring-amber-500/30">
                <svg className="h-3.5 w-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <div>
                <div className="text-xs font-semibold text-amber-300">YOLOv8n</div>
                <div className="text-[11px] text-slate-500">Vehicle detection</div>
                <div className="text-[11px] text-slate-500">Classes: car, bus, truck, moto</div>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 ring-1 ring-indigo-500/30">
                <svg className="h-3.5 w-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.347.347a3.75 3.75 0 01-5.304 0l-.349-.347z" />
                </svg>
              </div>
              <div>
                <div className="text-xs font-semibold text-indigo-300">TransReID</div>
                <div className="text-[11px] text-slate-500">Re-identification</div>
                <div className="text-[11px] text-slate-500">ResNet50 + Transformer</div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {showFrames && <FramesModal jobId={jobId} onClose={() => setShowFrames(false)} />}
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
          try { setResult(await getVideoResult(jobId)); } catch {}
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
          if (jobData.status === "completed") setResult(await getVideoResult(jobId));
        }
      } catch { clearInterval(interval); }
    }, 3000);
    return () => clearInterval(interval);
  }, [jobId]);

  if (loading) return (
    <div className="flex items-center gap-2 text-sm text-slate-400 py-8">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
      Loading…
    </div>
  );

  if (error || !job) return (
    <Card>
      <p className="text-sm text-rose-400">{error ?? "Job not found."}</p>
      <Link href="/videos" className="mt-2 block text-xs text-indigo-300 hover:underline">← Back to history</Link>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/videos" className="text-xs text-slate-400 hover:text-slate-200">← Analysis history</Link>
          <h1 className="mt-1 text-2xl font-semibold text-slate-50">{job.title}</h1>
          <p className="text-xs text-slate-500">Job #{job.id} · {new Date(job.created_at).toLocaleString()}</p>
        </div>
        <StatusBadge status={job.status} />
      </div>

      {/* Progress */}
      {job.status !== "completed" && job.status !== "failed" && (
        <Card title="Processing">
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-slate-400">
              <span>{job.status === "queued" ? "Waiting in queue…" : "Analyzing video…"}</span>
              <span>{job.progress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div className="h-full rounded-full bg-indigo-400 transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, job.progress))}%` }} />
            </div>
          </div>
        </Card>
      )}

      {job.status === "failed" && (
        <Card title="Processing Failed">
          <p className="text-sm text-rose-400">{job.error_message ?? "An unknown error occurred."}</p>
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
            ...(job.description ? [{ label: "Description", value: job.description }] : []),
          ].map(({ label, value }) => (
            <div key={label}>
              <dt className="text-xs text-slate-500">{label}</dt>
              <dd className="mt-0.5 text-slate-200 truncate">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      {/* Analysis Summary with frames viewer */}
      {result && <AnalysisSummary result={result} jobId={jobId} />}

      {/* Re-ID Results */}
      {job.status === "completed" && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-100">Re-Identification Results</h2>
          <ReIDResults jobId={jobId} />
        </div>
      )}
    </div>
  );
}