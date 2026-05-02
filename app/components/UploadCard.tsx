"use client";

import React, { useCallback, useRef, useState } from "react";
import { uploadVideo, VideoJob, CameraLocation } from "../lib/api";

interface Props {
  onUploaded?: (job: VideoJob) => void;
}

// ── Minimal embedded map pin picker ─────────────────────────────────────────
// Uses OpenStreetMap tiles + a click-to-place-pin interaction (no API key needed)
function MapPinPicker({
  value,
  onChange,
}: {
  value: CameraLocation | null;
  onChange: (loc: CameraLocation | null) => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  // Default center: Rawalpindi
  const [center] = useState({ lat: 33.5974, lng: 73.0541 });
  const [mapLoaded, setMapLoaded] = useState(false);
  const leafletRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  // Auto-load Leaflet on mount so the map is visible immediately
  const [autoInit, setAutoInit] = useState(false);

  const initMap = useCallback(() => {
    if (mapLoaded || !mapRef.current) return;
    if (typeof window === "undefined") return;

    // Dynamically load Leaflet CSS + JS
    const existingLink = document.getElementById("leaflet-css");
    if (!existingLink) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    const existingScript = document.getElementById("leaflet-js");
    if (existingScript) {
      initLeaflet();
      return;
    }

    const script = document.createElement("script");
    script.id = "leaflet-js";
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = initLeaflet;
    document.head.appendChild(script);
  }, [mapLoaded, center]);

  const initLeaflet = () => {
    if (!mapRef.current || leafletRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    const map = L.map(mapRef.current, { zoomControl: true }).setView(
      [center.lat, center.lng],
      13
    );

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    leafletRef.current = map;

    // Custom camera pin icon
    const cameraIcon = L.divIcon({
      className: "",
      html: `<div style="
        width:32px;height:32px;background:#6366f1;border:3px solid #fff;
        border-radius:50% 50% 50% 0;transform:rotate(-45deg);
        box-shadow:0 2px 8px rgba(0,0,0,0.4);
        display:flex;align-items:center;justify-content:center;
      ">
        <span style="transform:rotate(45deg);font-size:14px;">📍</span>
      </div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });

    map.on("click", (e: any) => {
      const { lat, lng } = e.latlng;
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = L.marker([lat, lng], { icon: cameraIcon }).addTo(map);
      }
      const name = `Camera @ ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      onChange({ lat: parseFloat(lat.toFixed(6)), lng: parseFloat(lng.toFixed(6)), name });
    });

    setMapLoaded(true);
  };

  // Trigger initMap on first render
  React.useEffect(() => {
    if (!autoInit) {
      setAutoInit(true);
      // Small delay to ensure DOM is ready
      setTimeout(() => initMap(), 100);
    }
  }, [autoInit, initMap]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-300">
          📍 Camera Location{" "}
          <span className="text-slate-500">(optional — click map to pin)</span>
        </span>
        {value && (
          <button
            type="button"
            onClick={() => {
              if (markerRef.current && leafletRef.current) {
                leafletRef.current.removeLayer(markerRef.current);
                markerRef.current = null;
              }
              onChange(null);
            }}
            className="text-[11px] text-rose-400 hover:text-rose-300 transition"
          >
            Clear pin
          </button>
        )}
      </div>

      {/* Map container — lazy init on hover/click */}
      <div
        ref={mapRef}
        onMouseEnter={initMap}
        onClick={initMap}
        className="relative h-48 w-full overflow-hidden rounded-xl border border-slate-700 bg-slate-800/60 cursor-crosshair"
        style={{ zIndex: 0 }}
      >
        {!mapLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-500 pointer-events-none">
            <svg className="h-8 w-8 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
            </svg>
            <span className="text-xs">Hover to load map · Click to place camera pin</span>
          </div>
        )}
      </div>

      {value && (
        <div className="flex items-center gap-2 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs text-indigo-300">
          <span>📍</span>
          <span className="font-mono">
            {value.lat.toFixed(4)}, {value.lng.toFixed(4)}
          </span>
          <input
            type="text"
            value={value.name || ""}
            onChange={(e) => onChange({ ...value, name: e.target.value })}
            placeholder="Label this camera…"
            className="ml-auto flex-1 bg-transparent text-indigo-200 placeholder-indigo-500/50 outline-none text-right"
            maxLength={100}
          />
        </div>
      )}
    </div>
  );
}

// ── Upload Card ───────────────────────────────────────────────────────────────
export function UploadCard({ onUploaded }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [cameraLocation, setCameraLocation] = useState<CameraLocation | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && dropped.type.startsWith("video/")) {
      setFile(dropped);
      if (!title) setTitle(dropped.name.replace(/\.[^/.]+$/, ""));
    }
  }, [title]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      if (!title) setTitle(f.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title.trim()) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title.trim());
    if (description.trim()) formData.append("description", description.trim());
    if (cameraLocation) {
      formData.append("camera_location", JSON.stringify(cameraLocation));
    }

    try {
      const job = await uploadVideo(formData);
      setSuccess(true);
      setFile(null);
      setTitle("");
      setDescription("");
      setCameraLocation(null);
      onUploaded?.(job);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-400">
          Analysis Title <span className="text-rose-400">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Main Gate – Morning Shift"
          required
          className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none ring-0 transition focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/40"
        />
      </div>

      {/* Description */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-400">
          Description <span className="text-slate-600">(optional)</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Additional notes about this analysis…"
          rows={2}
          className="w-full resize-none rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/40"
        />
      </div>

      {/* Video drop zone */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-400">
          Video File <span className="text-rose-400">*</span>
        </label>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 transition ${
            dragOver
              ? "border-indigo-400 bg-indigo-500/10"
              : file
              ? "border-emerald-500/40 bg-emerald-500/5"
              : "border-slate-700 bg-slate-800/40 hover:border-slate-600 hover:bg-slate-800/60"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={handleFileChange}
          />
          {file ? (
            <>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20">
                <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-emerald-300">{file.name}</p>
                <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
              </div>
            </>
          ) : (
            <>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-700/60">
                <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-slate-300">
                  {dragOver ? "Drop to add video" : "Drag & drop or click to browse"}
                </p>
                <p className="text-xs text-slate-500">MP4, AVI, MOV, MKV supported</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Camera Location Map Picker */}
      <MapPinPicker value={cameraLocation} onChange={setCameraLocation} />

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-300">
          {error}
        </div>
      )}

      {/* Success */}
      {success && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-300">
          ✓ Video uploaded successfully and queued for analysis.
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={uploading || !file || !title.trim()}
        className="w-full rounded-xl bg-indigo-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-950/30 transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {uploading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Uploading…
          </span>
        ) : (
          "Upload & Analyze"
        )}
      </button>
    </form>
  );
}