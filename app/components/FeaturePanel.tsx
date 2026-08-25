"use client";

import { useState } from "react";

export interface FeatureStats {
  embedding_dim: number;
  magnitude: number;
  mean: number;
  std: number;
  min: number;
  max: number;
  top_activations: { dim: number; value: number }[];
  heatmap_strip: number[];
  centroid_preview: number[];
}

export interface SimilarityNeighbor {
  vehicle_id: string;
  similarity: number;
}

interface Props {
  stats: FeatureStats;
  neighbors?: SimilarityNeighbor[];
  vehicleId: string;
}

// Map a value in [-1, 1] to a CSS color (blue → black → red)
function valueToColor(v: number, max = 0.15): string {
  // Clamp
  const clamped = Math.max(-max, Math.min(max, v));
  const norm = clamped / max; // -1..1

  if (norm >= 0) {
    // Black to amber/red for positive
    const r = Math.floor(245 * norm);
    const g = Math.floor(158 * norm);
    const b = Math.floor(11 * norm);
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    // Black to indigo/blue for negative
    const r = Math.floor(99 * -norm);
    const g = Math.floor(102 * -norm);
    const b = Math.floor(241 * -norm);
    return `rgb(${r}, ${g}, ${b})`;
  }
}

export function FeaturePanel({ stats, neighbors = [], vehicleId }: Props) {
  const [expanded, setExpanded] = useState(false);

  const heatmapMax = Math.max(...stats.heatmap_strip.map((v) => Math.abs(v)));

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
      {/* ── Inline compact stats row ── */}
      <div className="flex flex-wrap items-center gap-3 text-[11px]">
        <span className="font-mono text-slate-500 uppercase tracking-wider">
          Feature Profile
        </span>
        <span className="rounded-md bg-indigo-500/15 px-2 py-0.5 font-mono text-indigo-300 ring-1 ring-indigo-500/30">
          dim={stats.embedding_dim}
        </span>
        <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 font-mono text-emerald-300 ring-1 ring-emerald-500/30">
          ‖v‖={stats.magnitude.toFixed(3)}
        </span>
        <span className="font-mono text-slate-400">
          μ={stats.mean.toFixed(4)}
        </span>
        <span className="font-mono text-slate-400">
          σ={stats.std.toFixed(4)}
        </span>
        <span className="font-mono text-slate-500">
          range=[{stats.min.toFixed(3)}, {stats.max.toFixed(3)}]
        </span>
        <button
          onClick={() => setExpanded(!expanded)}
          className="ml-auto rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 font-mono text-[10px] text-slate-300 transition hover:border-amber-500/40 hover:text-amber-300"
        >
          {expanded ? "▲ HIDE FEATURES" : "▼ VIEW FEATURES"}
        </button>
      </div>

      {/* ── Inline compact heatmap (always visible, tiny) ── */}
      <div className="mt-2 flex h-3 w-full overflow-hidden rounded-sm border border-slate-800">
        {stats.heatmap_strip.map((v, i) => (
          <div
            key={i}
            className="flex-1"
            style={{ backgroundColor: valueToColor(v, heatmapMax) }}
            title={`bin ${i}: ${v.toFixed(4)}`}
          />
        ))}
      </div>

      {/* ── Expanded view ── */}
      {expanded && (
        <div className="mt-4 space-y-4 border-t border-slate-800 pt-4">
          {/* Big heatmap */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-wider text-slate-400">
                512-D Embedding (compressed to 64 bins)
              </span>
              <span className="font-mono text-[10px] text-slate-600">
                blue = negative · amber = positive
              </span>
            </div>
            <div className="flex h-10 w-full overflow-hidden rounded-md border border-slate-700">
              {stats.heatmap_strip.map((v, i) => (
                <div
                  key={i}
                  className="flex-1 border-r border-slate-900/40 transition hover:scale-y-110"
                  style={{ backgroundColor: valueToColor(v, heatmapMax) }}
                  title={`bin ${i}: ${v.toFixed(4)}`}
                />
              ))}
            </div>
          </div>

          {/* Top activations */}
          <div>
            <div className="mb-2 font-mono text-[11px] uppercase tracking-wider text-slate-400">
              Top Activated Dimensions
            </div>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {stats.top_activations.map((a) => {
                const isPos = a.value >= 0;
                return (
                  <div
                    key={a.dim}
                    className={`rounded-md border px-2 py-1.5 text-[11px] font-mono ${
                      isPos
                        ? "border-amber-500/30 bg-amber-500/5 text-amber-200"
                        : "border-indigo-500/30 bg-indigo-500/5 text-indigo-200"
                    }`}
                  >
                    <div className="text-slate-500 text-[9px]">DIM</div>
                    <div className="flex items-baseline gap-1">
                      <span className="font-bold">{a.dim}</span>
                      <span className="ml-auto text-[10px]">
                        {a.value.toFixed(3)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Centroid preview (first 32 dims as numbers) */}
          <details className="group">
            <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-wider text-slate-400 hover:text-slate-200">
              ▸ Raw Centroid Vector (first 32 dims)
            </summary>
            <div className="mt-2 grid grid-cols-4 gap-1 sm:grid-cols-8">
              {stats.centroid_preview.map((v, i) => (
                <div
                  key={i}
                  className="rounded bg-slate-800 px-1 py-0.5 font-mono text-[9px] text-slate-300"
                  title={`dim ${i}`}
                >
                  <span className="text-slate-600">{i}:</span>{" "}
                  <span className={v >= 0 ? "text-amber-300" : "text-indigo-300"}>
                    {v >= 0 ? "+" : ""}
                    {v.toFixed(3)}
                  </span>
                </div>
              ))}
            </div>
          </details>

          {/* Similarity to other vehicles */}
          {neighbors.length > 0 && (
            <div>
              <div className="mb-2 font-mono text-[11px] uppercase tracking-wider text-slate-400">
                Similarity to Other Vehicles
              </div>
              <div className="space-y-1">
                {neighbors
                  .slice()
                  .sort((a, b) => b.similarity - a.similarity)
                  .map((n) => {
                    const pct = Math.round(n.similarity * 100);
                    const barColor =
                      pct >= 70
                        ? "bg-emerald-500"
                        : pct >= 40
                        ? "bg-amber-500"
                        : "bg-slate-600";
                    return (
                      <div key={n.vehicle_id} className="flex items-center gap-2">
                        <span className="w-16 font-mono text-[11px] text-indigo-300">
                          {n.vehicle_id}
                        </span>
                        <div className="flex h-2.5 flex-1 overflow-hidden rounded-full bg-slate-800">
                          <div
                            className={`${barColor} transition-all`}
                            style={{ width: `${Math.max(2, pct)}%` }}
                          />
                        </div>
                        <span className="w-12 text-right font-mono text-[11px] tabular-nums text-slate-300">
                          {pct}%
                        </span>
                      </div>
                    );
                  })}
              </div>
              <p className="mt-2 text-[10px] text-slate-600">
                Cosine similarity between this vehicle's centroid and every other detected vehicle.
                Higher = more similar visual identity.
              </p>
            </div>
          )}

          {/* Educational caption */}
          <div className="rounded-md border border-cyan-500/20 bg-cyan-500/5 p-2.5">
            <p className="text-[10px] leading-relaxed text-cyan-300/80">
              <span className="font-semibold">ℹ️ How this works:</span> The TransReID transformer
              encodes each vehicle crop into a 512-dimensional vector that captures its visual
              identity (color, shape, structure). Vehicles with similar vectors are recognized as
              the same identity across cameras. The heatmap above visualises this vector for{" "}
              <span className="font-mono text-cyan-200">{vehicleId}</span>.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}