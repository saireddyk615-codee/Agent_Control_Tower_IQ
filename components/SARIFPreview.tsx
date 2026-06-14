"use client";

import { CopyButton } from "@/components/ui/CopyButton";
import type { ScanResult } from "@/types/security";

export function SARIFPreview({ scan }: { scan: ScanResult }) {
  const sarif = JSON.stringify(
    {
      version: "2.1.0",
      runs: [
        {
          tool: { driver: { name: "SecureGuard-LM IQ" } },
          results: scan.issues.map((issue) => ({
            ruleId: issue.cwe,
            level: issue.severity === "critical" || issue.severity === "high" ? "error" : "warning",
            message: { text: `${issue.title} detected with policy-grounded remediation guidance.` },
            locations: [
              {
                physicalLocation: {
                  artifactLocation: { uri: issue.location },
                },
              },
            ],
          })),
        },
      ],
    },
    null,
    2,
  );

  return (
    <section className="panel overflow-hidden rounded-2xl">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">
            SARIF-style export preview
          </p>
          <p className="mt-1 text-sm text-slate-500">Deterministic preview for CI/CD integrations</p>
        </div>
        <CopyButton value={sarif} />
      </div>
      <pre className="max-h-[440px] overflow-auto p-5 font-mono text-[12px] leading-6 text-slate-300">
        {sarif}
      </pre>
    </section>
  );
}
