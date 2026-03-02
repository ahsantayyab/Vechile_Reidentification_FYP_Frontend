"use client";

import Link from "next/link";
import { FormEvent, useState, useEffect, useRef } from "react";
import { uploadVideo } from "../lib/api";

// ── Animated counter ──────────────────────────────────────────────────────────
function Counter({ to, duration = 1800 }: { to: number; duration?: number }) {
  const [val, setVal] = useState(0);
  const ref = useRef(false);
  useEffect(() => {
    if (ref.current) return;
    ref.current = true;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      setVal(Math.floor(p * to));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [to, duration]);
  return <>{val.toLocaleString()}</>;
}

// ── Scanline overlay ──────────────────────────────────────────────────────────
function Scanlines() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 opacity-[0.03]"
      style={{
        backgroundImage: "repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 3px)",
      }}
    />
  );
}

// ── Blinking cursor ───────────────────────────────────────────────────────────
function Cursor() {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const t = setInterval(() => setOn((v) => !v), 530);
    return () => clearInterval(t);
  }, []);
  return <span className={`inline-block w-[2px] h-[1em] bg-amber-400 align-middle ml-0.5 ${on ? "opacity-100" : "opacity-0"}`} />;
}

// ── Upload section ────────────────────────────────────────────────────────────
function UploadSection() {
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastJobId, setLastJobId] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) { setError("No video file selected."); return; }
    setSubmitting(true); setError(null); setMessage(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title || file.name);
      const job = await uploadVideo(formData);
      setMessage(`JOB #${job.id} QUEUED — PROCESSING INITIATED`);
      setLastJobId(job.id);
      setTitle(""); setFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally { setSubmitting(false); }
  }

  return (
    <section id="upload" className="relative">
      {/* Section header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-gradient-to-r from-amber-500/40 to-transparent" />
        <span className="font-mono text-[11px] tracking-[0.2em] text-amber-500/70 uppercase">Input Terminal</span>
        <div className="h-px flex-1 bg-gradient-to-l from-amber-500/40 to-transparent" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault(); setDragOver(false);
            const f = e.dataTransfer.files[0];
            if (f) setFile(f);
          }}
          className={`relative flex min-h-[260px] flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all duration-300 ${
            dragOver
              ? "border-amber-400/80 bg-amber-500/5 shadow-lg shadow-amber-500/10"
              : file
              ? "border-green-500/50 bg-green-500/5"
              : "border-slate-700 bg-slate-900/40 hover:border-slate-600"
          }`}
        >
          <Scanlines />
          {/* Corner brackets */}
          {["top-2 left-2 border-t-2 border-l-2", "top-2 right-2 border-t-2 border-r-2", "bottom-2 left-2 border-b-2 border-l-2", "bottom-2 right-2 border-b-2 border-r-2"].map((cls) => (
            <span key={cls} className={`absolute h-4 w-4 ${file ? "border-green-400/60" : "border-amber-500/40"} ${cls}`} />
          ))}

          {file ? (
            <div className="relative z-10 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full border border-green-500/30 bg-green-500/10 mx-auto">
                <svg className="h-7 w-7 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-mono text-sm font-semibold text-green-300">{file.name}</p>
              <p className="mt-1 font-mono text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB · READY</p>
              <button onClick={() => setFile(null)} className="mt-3 font-mono text-xs text-slate-500 underline hover:text-slate-300">
                CLEAR
              </button>
            </div>
          ) : (
            <div className="relative z-10 text-center px-6">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-amber-500/20 bg-amber-500/5 mx-auto">
                <svg className="h-7 w-7 text-amber-400/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className="font-mono text-sm text-slate-300">DROP VIDEO FILE HERE</p>
              <p className="mt-1 font-mono text-xs text-slate-600">or click below to browse</p>
              <label className="mt-4 inline-block cursor-pointer rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 font-mono text-xs text-slate-300 hover:border-amber-500/40 hover:text-amber-300 transition">
                BROWSE FILES
                <input type="file" accept="video/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </label>
            </div>
          )}
        </div>

        {/* Form panel */}
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-[10px] tracking-widest text-amber-500/60 uppercase">Job Config</span>
            </div>

            <div>
              <label className="mb-1.5 block font-mono text-[11px] tracking-wider text-slate-500 uppercase">
                Job Title
              </label>
              <input
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 font-mono text-sm text-slate-100 placeholder:text-slate-700 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30 transition"
                placeholder="HIGHWAY_FEED_001..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Status readout */}
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 font-mono text-[11px] space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>DETECTOR</span><span className="text-amber-400/70">YOLOv8n</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>FEATURE MODEL</span><span className="text-amber-400/70">TransReID</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>FILE</span>
                <span className={file ? "text-green-400" : "text-slate-700"}>
                  {file ? "LOADED" : "NONE"}
                </span>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 font-mono text-xs text-rose-400">
                ✗ {error}
              </div>
            )}
            {message && (
              <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 font-mono text-xs text-green-400 space-y-1">
                <div>✓ {message}</div>
                {lastJobId && (
                  <Link href={`/videos/${lastJobId}`} className="text-amber-400 underline-offset-2 hover:underline">
                    → VIEW JOB #{lastJobId}
                  </Link>
                )}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting || !file}
            className="relative overflow-hidden rounded-xl border border-amber-500/30 bg-amber-500/10 px-6 py-3.5 font-mono text-sm font-semibold text-amber-300 transition-all hover:border-amber-400/60 hover:bg-amber-500/20 hover:shadow-lg hover:shadow-amber-500/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-3 w-3 animate-spin rounded-full border border-amber-400 border-t-transparent" />
                UPLOADING...
              </span>
            ) : (
              "▶ INITIATE ANALYSIS"
            )}
          </button>
        </form>
      </div>
    </section>
  );
}

// ── Recent jobs strip ─────────────────────────────────────────────────────────
function RecentStrip() {
  return (
    <section className="mt-4">
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-[11px] tracking-[0.2em] text-slate-600 uppercase">Recent Jobs</span>
        <Link href="/videos" className="font-mono text-[11px] text-amber-500/60 hover:text-amber-400 transition">
          VIEW ALL →
        </Link>
      </div>
      {/* Live RecentJobs component renders here */}
      <RecentJobsInline />
    </section>
  );
}

// ── Inline recent jobs (pulls from existing RecentJobs logic) ─────────────────
function RecentJobsInline() {
  const [jobs, setJobs] = useState<any[]>([]);
  const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

  useEffect(() => {
    fetch(`${API}/api/v1/videos?page=1&page_size=4`)
      .then((r) => r.json())
      .then((d) => setJobs(d.items ?? []))
      .catch(() => {});
  }, [API]);

  if (!jobs.length) return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-center font-mono text-xs text-slate-700">
      NO JOBS YET — UPLOAD A VIDEO ABOVE
    </div>
  );

  const statusColor: Record<string, string> = {
    completed: "text-green-400",
    processing: "text-amber-400",
    queued: "text-slate-500",
    failed: "text-rose-400",
  };

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {jobs.map((job: any) => (
        <Link
          key={job.id}
          href={`/videos/${job.id}`}
          className="group rounded-xl border border-slate-800 bg-slate-900/50 p-3 transition hover:border-slate-700 hover:bg-slate-900"
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <span className="font-mono text-[10px] text-slate-600">#{job.id}</span>
            <span className={`font-mono text-[10px] uppercase ${statusColor[job.status] ?? "text-slate-500"}`}>
              {job.status}
            </span>
          </div>
          <p className="font-mono text-xs text-slate-300 truncate group-hover:text-white transition">{job.title}</p>
          <p className="mt-1 font-mono text-[10px] text-slate-700">
            {new Date(job.created_at).toLocaleDateString()}
          </p>
        </Link>
      ))}
    </div>
  );
}



// ── Stats bar ─────────────────────────────────────────────────────────────────
function StatsBar() {
  const stats = [
    { label: "VEHICLES TRACKED", value: 12847, suffix: "+" },
    { label: "ACCURACY RATE", value: 94, suffix: "%" },
    { label: "CAMERAS SUPPORTED", value: 20, suffix: "" },
    { label: "AVG PROCESS TIME", value: 11, suffix: "s" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map(({ label, value, suffix }) => (
        <div key={label} className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
          <Scanlines />
          <div className="relative z-10">
            <div className="font-mono text-2xl font-bold text-slate-50">
              <Counter to={value} />{suffix}
            </div>
            <div className="mt-1 font-mono text-[10px] tracking-wider text-slate-600 uppercase">{label}</div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
        </div>
      ))}
    </div>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 px-8 py-14 sm:px-12 sm:py-20">
      <Scanlines />

      {/* Grid background */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Glow */}
      <div className="absolute -top-24 left-1/2 h-64 w-96 -translate-x-1/2 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-48 w-64 rounded-full bg-indigo-500/5 blur-3xl" />

      <div className="relative z-10 max-w-3xl">
        {/* Badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/5 px-3 py-1.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
          <span className="font-mono text-[11px] tracking-widest text-amber-400/80 uppercase">System Online</span>
        </div>

        {/* Headline */}
        <h1 className="font-mono text-4xl font-black leading-tight tracking-tight text-slate-50 sm:text-5xl lg:text-6xl">
          VEHICLE
          <br />
          <span className="text-amber-400">RE-IDENTIFICATION</span>
          <Cursor />
        </h1>

        <p className="mt-5 max-w-xl font-mono text-sm leading-relaxed text-slate-500">
          Multi-camera vehicle tracking using YOLOv8 detection and TransReID feature extraction.
          Upload surveillance footage — the system identifies and traces vehicles across camera feeds.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="#upload"
            className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-2.5 font-mono text-sm font-semibold text-amber-300 transition hover:border-amber-400/60 hover:bg-amber-500/20 hover:shadow-lg hover:shadow-amber-500/10"
          >
            ▶ START ANALYSIS
          </a>
          <Link
            href="/videos"
            className="flex items-center gap-2 rounded-xl border border-slate-700 bg-transparent px-5 py-2.5 font-mono text-sm text-slate-400 transition hover:border-slate-500 hover:text-slate-200"
          >
            VIEW HISTORY →
          </Link>
        </div>
      </div>

      {/* Corner tag */}
      <div className="absolute right-6 top-6 font-mono text-[10px] tracking-widest text-slate-800 uppercase">
        v2.0 · FYP
      </div>
    </section>
  );
}

// ── About / How it works ──────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    {
      num: "01",
      title: "UPLOAD FOOTAGE",
      desc: "Submit MP4, MOV, or any video format from surveillance or dashcam sources.",
      color: "text-amber-400",
      border: "border-amber-500/20",
      bg: "bg-amber-500/5",
    },
    {
      num: "02",
      title: "YOLO DETECTION",
      desc: "YOLOv8n scans each sampled frame, localizing vehicles: cars, trucks, buses, motorcycles.",
      color: "text-blue-400",
      border: "border-blue-500/20",
      bg: "bg-blue-500/5",
    },
    {
      num: "03",
      title: "TRANSREID FEATURES",
      desc: "ResNet50 + Transformer encoder extracts 512-dim identity embeddings per crop.",
      color: "text-violet-400",
      border: "border-violet-500/20",
      bg: "bg-violet-500/5",
    },
    {
      num: "04",
      title: "TRAJECTORY MAP",
      desc: "Cosine similarity clusters detections into unique identities. Tracks them across camera views.",
      color: "text-green-400",
      border: "border-green-500/20",
      bg: "bg-green-500/5",
    },
  ];

  return (
    <section id="about">
      <div className="mb-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-gradient-to-r from-slate-700/50 to-transparent" />
        <span className="font-mono text-[11px] tracking-[0.2em] text-slate-600 uppercase">Pipeline</span>
        <div className="h-px flex-1 bg-gradient-to-l from-slate-700/50 to-transparent" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map(({ num, title, desc, color, border, bg }) => (
          <div key={num} className={`relative rounded-2xl border ${border} ${bg} p-5 overflow-hidden`}>
            <Scanlines />
            <div className={`relative z-10 font-mono text-3xl font-black ${color} opacity-30 mb-3`}>{num}</div>
            <div className={`relative z-10 font-mono text-xs font-bold ${color} mb-2 tracking-wider`}>{title}</div>
            <p className="relative z-10 font-mono text-[11px] leading-relaxed text-slate-600">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Page root ─────────────────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <div className="space-y-10">
      <Hero />
      {/* <StatsBar /> */}
      <HowItWorks />
      <UploadSection />
      <RecentStrip />
    </div>
  );
}