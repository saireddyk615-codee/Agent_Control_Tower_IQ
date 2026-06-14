"use client";
/* eslint-disable react-hooks/set-state-in-effect -- one-time portal session restoration is intentional */

import { useEffect, useRef, useState } from "react";
import { usePortalSession } from "@/components/providers/PortalSessionProvider";
import { PageHeader } from "@/components/ui/PageHeader";

const extensionPath = "~/IdeaProjects/SecureGuard-LM IQ/vscode-extension";
const vsixPath      = "~/IdeaProjects/SecureGuard-LM IQ/vscode-extension/agent-watchtower.vsix";

const VS_CODE_COMMANDS = [
  { cmd: "Agent Watchtower: Run Quick Scan",          desc: "Fast scan: repo safety, secrets, git diff" },
  { cmd: "Agent Watchtower: Run Full Scan",           desc: "All 8 checks including code security review" },
  { cmd: "Agent Watchtower: Start Realtime Watch",    desc: "Watch for file changes and scan automatically" },
  { cmd: "Agent Watchtower: Stop Realtime Watch",     desc: "Stop the file watcher" },
  { cmd: "Agent Watchtower: Open Latest Report",      desc: "Open the most recent JSON/Markdown report" },
  { cmd: "Agent Watchtower: Generate Agent Instructions", desc: "Create guardrail files for AI agents" },
  { cmd: "Agent Watchtower: Apply Safe Fixes",        desc: "Auto-apply approved non-risky fixes" },
  { cmd: "Agent Watchtower: Install Pre-Commit Gate", desc: "Block commits that fail security scan" },
];

const INSTALL_CMDS = `cd ~/IdeaProjects/SecureGuard-LM\\ IQ
npm run extension:install
npm run extension:compile
npm run extension:package`;

const CLI_CMDS = `# Quick scan
npm run watchtower -- scan --repo /path/to/project --checks quick

# Full scan
npm run watchtower -- scan --repo /path/to/project --checks full

# Paths with spaces are supported
npm run watchtower -- scan --repo "/path/to/Workout App" --checks quick

# Generate latest report
npm run watchtower -- report --repo /path/to/project

# Real-time watch
npm run watchtower -- watch --repo /path/to/project

# Install pre-commit gate
npm run watchtower -- install-hook --repo /path/to/project`;

function CmdBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard?.writeText(code).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="relative">
      {label && <p className="mb-1.5 text-xs font-semibold text-slate-600">{label}</p>}
      <pre className="wt-cmd">{code}</pre>
      <button
        className="absolute right-2 top-2 rounded border border-slate-600 bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-300 hover:bg-slate-700 transition"
        onClick={copy}
        type="button"
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}

export default function IntegrationsPage() {
  const { session, hydrated, updateIntegrations } = usePortalSession();
  const restored = useRef(false);
  const [activeTab, setActiveTab] = useState<"vscode" | "cli" | "realtime">("vscode");

  useEffect(() => {
    if (!hydrated || restored.current) return;
    restored.current = true;
    const saved = session.integrations.lastSelectedSection;
    if (saved === "cli" || saved === "realtime") setActiveTab(saved);
    updateIntegrations({ extensionPath, vsixPath });
  }, [hydrated, session.integrations, updateIntegrations]);

  function choose(tab: typeof activeTab) {
    setActiveTab(tab);
    updateIntegrations({ lastSelectedSection: tab, extensionPath, vsixPath });
  }

  const tabs = [
    { id: "vscode" as const,   label: "VS Code Extension" },
    { id: "cli"    as const,   label: "CLI" },
    { id: "realtime" as const, label: "Realtime Watch" },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Local developer workflow"
        title="IDE Extension"
        description="Run Agent Watchtower directly from VS Code or the CLI — no cloud required."
      />

      {/* Tab bar */}
      <div className="mb-5 flex flex-wrap gap-2">
        {tabs.map(({ id, label }) => (
          <button
            className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${activeTab === id ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
            key={id}
            onClick={() => choose(id)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── VS Code tab ── */}
      {activeTab === "vscode" && (
        <div className="space-y-5 wt-fade-up">
          <section className="wt-card p-5">
            <h2 className="mb-3 font-semibold text-slate-950">About the extension</h2>
            <p className="text-sm leading-6 text-slate-600">
              The Agent Watchtower VS Code extension runs local static analysis inside your editor —
              no source code is uploaded, no AI cloud model is called for scanning, and no project code is executed.
            </p>
            <p className="mt-2 font-mono text-xs text-slate-500 break-all">{extensionPath}</p>
          </section>

          <section className="wt-card p-5">
            <h2 className="mb-3 font-semibold text-slate-950">Install from VSIX</h2>
            <CmdBlock code={INSTALL_CMDS} />
            <p className="mt-3 text-sm text-slate-600">
              Then in VS Code: <strong>Extensions</strong> → <strong>⋯</strong> → <strong>Install from VSIX</strong>
            </p>
            <p className="mt-1 font-mono text-xs text-slate-500 break-all">{vsixPath}</p>
          </section>

          <section className="wt-card p-5">
            <h2 className="mb-3 font-semibold text-slate-950">Run with F5 (Extension Development Host)</h2>
            <p className="text-sm text-slate-600">
              Open the <code className="rounded bg-slate-100 px-1 py-0.5">vscode-extension</code> folder in VS Code and press{" "}
              <kbd className="rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 font-mono text-xs">F5</kbd>.
              Agent Watchtower appears in the Extension Development Host window.
            </p>
          </section>

          <section className="wt-card p-5">
            <h2 className="mb-3 font-semibold text-slate-950">Available commands</h2>
            <div className="space-y-2">
              {VS_CODE_COMMANDS.map(({ cmd, desc }) => (
                <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5" key={cmd}>
                  <div className="flex items-start gap-2">
                    <code className="mt-0.5 shrink-0 rounded bg-blue-100 px-2 py-0.5 font-mono text-xs text-blue-800">{cmd}</code>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{desc}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* ── CLI tab ── */}
      {activeTab === "cli" && (
        <div className="space-y-5 wt-fade-up">
          <section className="wt-card p-5">
            <h2 className="mb-3 font-semibold text-slate-950">CLI commands</h2>
            <CmdBlock code={CLI_CMDS} />
            <p className="mt-3 text-sm text-slate-600">
              The CLI is a thin wrapper around the same Watchtower engine that powers the web portal.
              Paths with spaces are supported — wrap in quotes or escape the space.
            </p>
          </section>

          <section className="wt-card p-5">
            <h2 className="mb-3 font-semibold text-slate-950">Pre-commit gate</h2>
            <CmdBlock code="npm run watchtower -- install-hook --repo /path/to/project" label="Install" />
            <p className="mt-3 text-sm text-slate-600">
              Installs a Git pre-commit hook that runs a quick Watchtower scan and blocks the commit if the risk
              score exceeds the threshold. No network access is needed.
            </p>
          </section>
        </div>
      )}

      {/* ── Realtime tab ── */}
      {activeTab === "realtime" && (
        <div className="space-y-5 wt-fade-up">
          <section className="wt-card p-5">
            <h2 className="mb-3 font-semibold text-slate-950">Start realtime watch</h2>
            <CmdBlock code="npm run watchtower -- watch --repo /path/to/project" label="CLI" />
            <p className="mt-3 text-sm text-slate-600">
              Watches for file-system changes and re-runs a quick scan automatically. Writes results
              to <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs">.agent-control-tower/watchtower-latest.json</code>.
            </p>
          </section>
          <section className="wt-card p-5">
            <h2 className="mb-3 font-semibold text-slate-950">From VS Code</h2>
            <div className="space-y-2">
              {[
                { cmd: "Agent Watchtower: Start Realtime Watch", desc: "Start watching for changes" },
                { cmd: "Agent Watchtower: Stop Realtime Watch",  desc: "Stop the watcher" },
              ].map(({ cmd, desc }) => (
                <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5" key={cmd}>
                  <code className="rounded bg-blue-100 px-2 py-0.5 font-mono text-xs text-blue-800">{cmd}</code>
                  <p className="mt-1 text-xs text-slate-500">{desc}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
