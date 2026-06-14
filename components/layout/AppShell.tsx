"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { usePortalSession } from "@/components/providers/PortalSessionProvider";
import type { WatchtowerUserReport } from "@/types/security";

const items = [
  ["/watchtower", "Watchtower"],
  ["/reports", "Reports"],
  ["/compare", "Compare"],
  ["/integrations", "IDE Extension"],
  ["/submission", "Submission"],
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { session, hydrated, clearSession } = usePortalSession();
  const projectName = (session.watchtower.lastResult as WatchtowerUserReport | null)?.projectName;
  const sessionStatus = hydrated && session.watchtower.lastResult
    ? `Last scan: ${session.lastDecision?.replaceAll("_", " ") ?? "saved"} · risk ${session.lastRiskScore ?? "?"} · ${projectName ?? "project"}`
    : null;
  function clearGlobalSession() {
    clearSession();
    window.location.reload();
  }
  return (
    <div className="saas-shell min-h-screen bg-slate-50 text-slate-950">
      <header className="sticky top-0 z-40 h-16 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="flex h-full items-center justify-between px-4 lg:px-6">
          <Link className="flex items-center gap-3 font-semibold text-slate-950" href="/">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-600 text-xs font-bold text-white">AC</span>
            <span>Agent Control Tower IQ</span>
          </Link>
          <div className="flex items-center gap-2"><span className="hidden rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 sm:inline">Mock IQ Mode</span>{sessionStatus ? <Link className="hidden max-w-md truncate text-xs font-semibold text-slate-600 xl:block" href="/watchtower">{sessionStatus}</Link> : null}<button className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50" onClick={clearGlobalSession} type="button">Clear Session</button></div>
        </div>
      </header>
      <div className="lg:flex">
        <aside className="border-b border-slate-200 bg-white lg:min-h-[calc(100vh-64px)] lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r lg:p-4">
          <nav className="flex gap-1 overflow-x-auto p-3 lg:block lg:space-y-1 lg:overflow-visible lg:p-0" aria-label="Product navigation">
            {items.map(([href, label]) => {
              const active = pathname === href;
              return <Link className={`block shrink-0 rounded-lg px-3 py-2.5 text-sm font-medium transition ${active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"}`} href={href} key={href}>{label}</Link>;
            })}
          </nav>
        </aside>
        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-[1400px] p-4 lg:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
