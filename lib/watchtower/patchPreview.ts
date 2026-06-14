import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { WatchtowerRunResult } from "../../types/security.ts";
import { validateWatchtowerRepoPath } from "./watchtowerValidation.ts";

export async function generateWatchtowerPatchPreview(repoPathValue: string, result: WatchtowerRunResult, findingIds: string[]) {
  const repoPath = await validateWatchtowerRepoPath(repoPathValue);
  const selected = new Set(findingIds);
  const findings = result.findings.filter((finding) => selected.has(finding.id) && !finding.safeFixAvailable);
  const patchPreview = `# Agent Watchtower suggested fixes
# Preview only. No source, package, workflow, Docker, CI/CD, or deployment files were modified.
# Every recommendation below requires human review.

${findings.map((finding) => `# Finding: ${finding.id} ${finding.title ?? finding.explanation}
# Severity: ${finding.severity.toUpperCase()}
# File: ${finding.file}${finding.line ? `:${finding.line}` : ""}
# Why it matters: ${finding.explanation}
# Recommended manual change: ${finding.recommendation}
# Safe patch preview: Review ${finding.file}${finding.line ? `:${finding.line}` : ""} and apply only after testing: ${finding.recommendation}
# ---
`).join("\n") || "# No selected manual-risk findings were available for a patch preview.\n"}`;
  const directory = join(repoPath, ".agent-control-tower");
  const patchPath = join(directory, "watchtower-suggested-fixes.patch");
  await mkdir(directory, { recursive: true });
  await writeFile(patchPath, patchPreview, "utf8");
  return { patchPath, patchPreview, manualReviewRequired: true };
}
