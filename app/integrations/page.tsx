"use client";
/* eslint-disable react-hooks/set-state-in-effect -- one-time portal session restoration is intentional */

import { useEffect, useRef, useState } from "react";
import { usePortalSession } from "@/components/providers/PortalSessionProvider";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";

const sections = ["VS Code Extension", "CLI", "Realtime"] as const;
const extensionPath = "~/IdeaProjects/SecureGuard-LM IQ/vscode-extension";
const vsixPath = "~/IdeaProjects/SecureGuard-LM IQ/vscode-extension/agent-watchtower.vsix";

export default function IntegrationsPage() {
  const { session, hydrated, updateIntegrations } = usePortalSession();
  const restored = useRef(false);
  const [selected, setSelected] = useState<(typeof sections)[number]>("VS Code Extension");
  const [copied, setCopied] = useState("");

  useEffect(() => {
    if (!hydrated || restored.current) return;
    restored.current = true;
    const saved = session.integrations.lastSelectedSection;
    if (sections.includes(saved as (typeof sections)[number])) setSelected(saved as (typeof sections)[number]);
    setCopied(session.integrations.lastCommandCopied ?? "");
    updateIntegrations({ extensionPath, vsixPath });
  }, [hydrated, session.integrations, updateIntegrations]);

  function choose(section: (typeof sections)[number]) {
    setSelected(section);
    updateIntegrations({ lastSelectedSection: section, extensionPath, vsixPath });
  }
  async function copy(command: string) {
    await navigator.clipboard?.writeText(command).catch(() => undefined);
    setCopied(command); updateIntegrations({ lastCommandCopied: command, extensionPath, vsixPath });
  }
  const cliCommand = "npm run watchtower -- scan --repo /path/to/project --checks full";
  return <div><PageHeader eyebrow="Local developer workflow" title="IDE Extension" description="Use Agent Watchtower from VS Code or the local CLI." />
    <div className="mb-5 flex flex-wrap gap-2">{sections.map((section) => <button className={`rounded-lg border px-4 py-2 text-sm font-semibold ${selected === section ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600"}`} key={section} onClick={() => choose(section)} type="button">{section}</button>)}</div>
    <div className="grid gap-5 lg:grid-cols-2">
      <Section title="VS Code Extension"><p className="text-sm leading-6 text-slate-600">The VS Code extension is local for the hackathon demo. It can run through Extension Development Host or be installed from a generated VSIX file.</p><p className="mt-3 break-all font-mono text-xs text-slate-500">{extensionPath}</p></Section>
      <Section title="Install from VSIX"><pre className="studio-preview">cd ~/IdeaProjects/SecureGuard-LM\ IQ{"\n"}npm run extension:install{"\n"}npm run extension:compile{"\n"}npm run extension:package</pre><p className="mt-3 text-sm text-slate-600">VS Code → Extensions → ... → Install from VSIX</p><p className="mt-3 break-all font-mono text-xs text-slate-500">{vsixPath}</p></Section>
      <Section title="Run locally with F5"><p className="text-sm leading-6 text-slate-600">Open the <code>vscode-extension</code> folder in VS Code and press F5. Agent Watchtower appears in the Extension Development Host.</p></Section>
      <Section title="CLI commands"><pre className="studio-preview">npm run watchtower -- scan --repo /path/to/project --checks quick{"\n"}{cliCommand}{"\n"}npm run watchtower -- report --repo /path/to/project</pre><button className="mt-3 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700" onClick={() => copy(cliCommand)} type="button">{copied === cliCommand ? "Command copied" : "Copy full scan command"}</button></Section>
      <Section title="Realtime watch"><pre className="studio-preview">npm run watchtower -- watch --repo /path/to/project</pre></Section>
      <Section title="Pre-commit gate"><pre className="studio-preview">npm run watchtower -- install-hook --repo /path/to/project</pre></Section>
      <Section title="Available commands"><p className="text-sm leading-6 text-slate-600">Agent Watchtower: Run Quick Scan · Agent Watchtower: Run Full Scan · Agent Watchtower: Start Realtime Watch · Agent Watchtower: Stop Realtime Watch · Agent Watchtower: Open Latest Report · Agent Watchtower: Generate Agent Instructions · Agent Watchtower: Apply Safe Fixes · Agent Watchtower: Install Pre-Commit Gate</p></Section>
    </div>
  </div>;
}
