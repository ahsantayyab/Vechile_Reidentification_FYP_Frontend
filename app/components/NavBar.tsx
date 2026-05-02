"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

const links = [
  { href: "/", label: "HOME" },
  { href: "/videos", label: "HISTORY" },
  { href: "/trajectories", label: "TRAJECTORIES" },
];

export function NavBar() {
  const pathname = usePathname();
  const [time, setTime] = useState("");

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString("en-US", { hour12: false }));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <header className="relative flex items-center justify-between px-4 py-3">
      {/* Background */}
      <div className="absolute inset-0 rounded-2xl border border-slate-800 bg-slate-950/90 backdrop-blur-xl" />
      {/* Top amber line */}
      <div className="absolute inset-x-0 top-0 h-px rounded-t-2xl bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
      {/* Bottom subtle line */}
      <div className="absolute inset-x-0 bottom-0 h-px rounded-b-2xl bg-gradient-to-r from-transparent via-slate-700/40 to-transparent" />

      {/* Left — Logo */}
      <div className="relative flex items-center gap-3">
        {/* Status indicator */}
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-40" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
          </span>
        </div>

        <div className="h-5 w-px bg-slate-800" />

        {/* Logo mark */}
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded border border-amber-500/30 bg-amber-500/5">
            <svg className="h-3.5 w-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.87V15.13a1 1 0 01-1.447.9L15 14M3 8h12a1 1 0 011 1v6a1 1 0 01-1 1H3a1 1 0 01-1-1V9a1 1 0 011-1z" />
            </svg>
          </div>
          <div>
            <div className="font-mono text-xs font-bold tracking-[0.15em] text-slate-100">VEHICLE<span className="text-amber-400">ReID</span></div>
            <div className="font-mono text-[9px] tracking-widest text-slate-700 uppercase">Re-Identification System</div>
          </div>
        </div>
      </div>

      {/* Center — Nav */}
      <nav className="relative flex items-center gap-1">
        {links.map((link) => {
          const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={[
                "relative px-4 py-1.5 font-mono text-[11px] tracking-[0.15em] font-medium transition-all duration-200 rounded-lg",
                active
                  ? "text-amber-300 bg-amber-500/10 border border-amber-500/20"
                  : "text-slate-600 hover:text-slate-300 hover:bg-slate-900 border border-transparent",
              ].join(" ")}
            >
              {active && <span className="absolute left-1.5 top-1/2 -translate-y-1/2 h-1 w-1 rounded-full bg-amber-400" />}
              <span className={active ? "ml-2" : ""}>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Right — System info + CTA */}
      <div className="relative flex items-center gap-3">
        {/* Live clock */}
        <div className="hidden sm:flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          <span className="font-mono text-[10px] tabular-nums text-slate-600">{time}</span>
        </div>

        <div className="hidden sm:block h-4 w-px bg-slate-800" />

        {/* Analyze CTA */}
        <Link
          href="/#upload"
          className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 font-mono text-[11px] font-semibold tracking-widest text-amber-300 transition-all hover:border-amber-400/50 hover:bg-amber-500/15 hover:shadow-md hover:shadow-amber-500/10"
        >
          <span className="text-amber-400">▶</span>
          ANALYZE
        </Link>
      </div>
    </header>
  );
}