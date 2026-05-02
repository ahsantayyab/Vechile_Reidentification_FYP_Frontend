"use client";

import { useEffect, useRef, useState } from "react";

export interface Waypoint {
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

interface Props {
  waypoints: Waypoint[];
  plateNumber?: string;
  height?: string;
}

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#06b6d4", "#8b5cf6", "#f43f5e"];

export function TrajectoryRoadMap({ waypoints, plateNumber, height = "h-[480px]" }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [durationMin, setDurationMin] = useState<number | null>(null);

  useEffect(() => {
    if (mapInstanceRef.current) return;
    if (!mapRef.current) return;
    if (waypoints.length === 0) return;

    if ((mapRef.current as any)._leaflet_id) {
      delete (mapRef.current as any)._leaflet_id;
    }

    import("leaflet").then(async (L) => {
      if (!mapRef.current || mapInstanceRef.current) return;

      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      // Center map on waypoints
      const lats = waypoints.map((w) => w.lat);
      const lngs = waypoints.map((w) => w.lng);
      const center: [number, number] = [
        (Math.min(...lats) + Math.max(...lats)) / 2,
        (Math.min(...lngs) + Math.max(...lngs)) / 2,
      ];

      const map = L.map(mapRef.current!).setView(center, 13);
      mapInstanceRef.current = map;

      // Use a satellite-style tile layer (looks more like Google Maps)
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        { attribution: "©OpenStreetMap ©CartoDB", maxZoom: 19 }
      ).addTo(map);

      // Add numbered markers for each waypoint
      const bounds: [number, number][] = [];
      waypoints.forEach((wp, idx) => {
        const color = COLORS[idx % COLORS.length];
        const label = String.fromCharCode(65 + idx); // A, B, C...

        const icon = L.divIcon({
          html: `
            <div style="
              position:relative;
              width:36px;height:46px;
              display:flex;align-items:flex-start;justify-content:center;
              filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));
            ">
              <div style="
                width:32px;height:32px;background:${color};
                border:3px solid #fff;border-radius:50% 50% 50% 0;
                transform:rotate(-45deg);
                display:flex;align-items:center;justify-content:center;
              ">
                <span style="
                  transform:rotate(45deg);
                  color:#fff;font-weight:700;font-size:14px;
                ">${label}</span>
              </div>
            </div>`,
          className: "",
          iconSize: [36, 46],
          iconAnchor: [18, 46],
        });

        const marker = L.marker([wp.lat, wp.lng], { icon }).addTo(map);
        const popupHtml = `
          <div style="min-width:200px">
            <div style="font-weight:600;color:#1e293b;margin-bottom:4px">
              <span style="
                background:${color};color:#fff;border-radius:4px;
                padding:1px 6px;font-size:11px;margin-right:6px;
              ">${label}</span>
              ${wp.name}
            </div>
            <div style="font-size:11px;color:#475569;margin-bottom:4px">
              <strong>Video:</strong> ${wp.title}
            </div>
            <div style="font-size:11px;color:#475569;margin-bottom:4px">
              <strong>Vehicle:</strong> ${wp.vehicle_id ?? "—"}
            </div>
            <div style="font-size:11px;color:#475569;margin-bottom:4px">
              <strong>Seen:</strong> ${wp.first_seen_in_video.toFixed(1)}s – ${wp.last_seen_in_video.toFixed(1)}s
            </div>
            <div style="font-size:11px;color:#475569">
              <strong>Detections:</strong> ${wp.detection_count}
            </div>
            ${
              wp.thumbnail_url
                ? `<a href="${wp.thumbnail_url}" target="_blank" style="
                    display:block;margin-top:6px;padding:4px 8px;
                    background:#6366f1;color:#fff;border-radius:4px;
                    text-align:center;font-size:11px;text-decoration:none;
                  ">View frame →</a>`
                : ""
            }
          </div>`;
        marker.bindPopup(popupHtml);
        bounds.push([wp.lat, wp.lng]);
      });

      // Fit map to all waypoints
      if (bounds.length > 1) {
        map.fitBounds(bounds as any, { padding: [40, 40] });
      }

      // Draw road path between waypoints using OSRM
      if (waypoints.length >= 2) {
        setRouteLoading(true);
        setRouteError(null);

        try {
          // Build OSRM URL: lng,lat;lng,lat;...
          const coords = waypoints.map((w) => `${w.lng},${w.lat}`).join(";");
          const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;

          const response = await fetch(url);
          const data = await response.json();

          if (data.code === "Ok" && data.routes?.[0]) {
            const route = data.routes[0];
            const geometry = route.geometry; // GeoJSON LineString

            // Draw the road path
            const routeLayer = L.geoJSON(geometry, {
              style: {
                color: "#6366f1",
                weight: 5,
                opacity: 0.85,
                dashArray: undefined,
              },
            }).addTo(map);

            // Animated arrow effect
            const animatedLine = L.polyline(
              (geometry.coordinates as [number, number][]).map(([lng, lat]) => [lat, lng]),
              {
                color: "#a5b4fc",
                weight: 2,
                opacity: 0.8,
                dashArray: "10, 12",
                className: "animated-route",
              }
            ).addTo(map);

            // Stats
            setDistanceKm(route.distance / 1000);
            setDurationMin(route.duration / 60);
          } else {
            // Fallback: straight dashed line
            setRouteError("No road route found — showing straight line");
            const fallback = L.polyline(
              waypoints.map((w) => [w.lat, w.lng]),
              { color: "#6366f1", weight: 3, opacity: 0.7, dashArray: "8 8" }
            ).addTo(map);
          }
        } catch (err) {
          setRouteError("Could not load road route");
          // Fallback line
          L.polyline(
            waypoints.map((w) => [w.lat, w.lng]),
            { color: "#6366f1", weight: 3, opacity: 0.7, dashArray: "8 8" }
          ).addTo(map);
        } finally {
          setRouteLoading(false);
        }
      }

      // Stats overlay (top-left)
      const statsControl = L.control({ position: "topright" });
      statsControl.onAdd = () => {
        const div = L.DomUtil.create("div");
        div.innerHTML = `
          <div style="
            background:rgba(15,23,42,0.92);border:1px solid #334155;
            border-radius:8px;padding:10px 14px;min-width:200px;
            backdrop-filter:blur(8px);
          ">
            <div style="font-size:10px;font-weight:600;color:#94a3b8;
                margin-bottom:6px;letter-spacing:0.05em">
              VEHICLE TRAJECTORY${plateNumber ? ` — 🪪 ${plateNumber}` : ""}
            </div>
            <div style="display:flex;gap:12px;font-size:11px;color:#e2e8f0">
              <div>
                <div style="color:#94a3b8;font-size:10px">Cameras</div>
                <div style="font-size:16px;font-weight:700;color:#a5b4fc">${waypoints.length}</div>
              </div>
              <div>
                <div style="color:#94a3b8;font-size:10px">Detections</div>
                <div style="font-size:16px;font-weight:700;color:#fbbf24">${waypoints.reduce((s, w) => s + w.detection_count, 0)}</div>
              </div>
            </div>
          </div>`;
        return div;
      };
      statsControl.addTo(map);
    });

    return () => {
      if (mapInstanceRef.current) {
        (mapInstanceRef.current as any).remove();
        mapInstanceRef.current = null;
      }
    };
  }, [waypoints, plateNumber]);

  return (
    <div className="space-y-3">
      <style>{`
        .animated-route {
          stroke-dashoffset: 0;
          animation: dash-flow 1s linear infinite;
        }
        @keyframes dash-flow {
          to { stroke-dashoffset: -22; }
        }
      `}</style>
      <div
        ref={mapRef}
        className={`${height} w-full rounded-xl border border-slate-700 overflow-hidden`}
      />

      {/* Route stats */}
      <div className="flex flex-wrap items-center gap-3">
        {routeLoading && (
          <div className="flex items-center gap-2 rounded-lg bg-slate-800/60 px-3 py-1.5 text-xs text-slate-400">
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
            Calculating road path…
          </div>
        )}
        {distanceKm !== null && (
          <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs">
            <span className="text-slate-400">Distance:</span>{" "}
            <span className="font-semibold text-indigo-300">{distanceKm.toFixed(1)} km</span>
          </div>
        )}
        {durationMin !== null && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs">
            <span className="text-slate-400">Estimated drive:</span>{" "}
            <span className="font-semibold text-emerald-300">{durationMin.toFixed(0)} min</span>
          </div>
        )}
        {routeError && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-300">
            {routeError}
          </div>
        )}
      </div>

      {/* Waypoint list */}
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {waypoints.map((wp, idx) => {
          const color = COLORS[idx % COLORS.length];
          const label = String.fromCharCode(65 + idx);
          return (
            <a
              key={wp.video_id}
              href={`/videos/${wp.video_id}`}
              className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800/40 p-3 transition hover:border-indigo-500/40 hover:bg-slate-800"
            >
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold text-white"
                style={{ background: color }}
              >
                {label}
              </div>
              {wp.thumbnail_url && (
                <div className="h-12 w-16 shrink-0 overflow-hidden rounded-md bg-slate-700">
                  <img
                    src={wp.thumbnail_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-slate-100">
                  {wp.name}
                </div>
                <div className="truncate text-xs text-slate-400">
                  {wp.title} · {wp.detection_count} detections
                </div>
                <div className="text-[10px] text-slate-500">
                  {wp.uploaded_at ? new Date(wp.uploaded_at).toLocaleString() : "—"}
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}