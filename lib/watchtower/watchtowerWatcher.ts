import chokidar from "chokidar";
import { relative, resolve } from "node:path";
import type { WatchtowerConfig, WatchtowerEvent } from "../../types/security.ts";
import { runWatchtowerOnce } from "./watchtowerEngine.ts";
import { validateWatchtowerRepoPath } from "./watchtowerValidation.ts";

const ignored = /(^|[/\\])(?:node_modules|\.next|dist|build|\.git|\.agent-control-tower)([/\\]|$)|(^|[/\\])(?:\.agent-safety\.yml|AGENT_WATCHTOWER_REPORT\.(?:md|json)|AGENT_COMMIT_GATE\.md|AGENT_SAFETY_COMPILER_OUTPUT\.md|agent\.lock\.json)$|\.(?:png|jpe?g|gif|webp|svg|mp4|mov|zip|pdf)$/i;

export async function startWatchtowerWatcher(config: WatchtowerConfig, onEvent: (event: WatchtowerEvent) => void): Promise<{ stop: () => Promise<void> }> {
  const repoPath = await validateWatchtowerRepoPath(resolve(config.repoPath));
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running = false;
  const emit = (event: Omit<WatchtowerEvent, "id" | "timestamp">) => onEvent({ id: `watch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, timestamp: new Date().toISOString(), ...event });
  const run = async (changedFile?: string) => {
    if (running) return;
    running = true;
    emit({ type: "scan_started", message: changedFile ? `Scanning after ${changedFile} changed.` : "Starting Agent Watchtower scan.", file: changedFile });
    try {
      const result = await runWatchtowerOnce({ ...config, watchMode: true });
      emit({ type: "diff_analyzed", message: `${result.changedFiles.length} current git changes analyzed.` });
      for (const finding of result.findings) emit({ type: "risk_detected", message: finding.explanation, severity: finding.severity, file: finding.file });
      emit({ type: "artifact_generated", message: `${result.generatedArtifacts.length} local safety artifacts generated.` });
      emit({ type: "scan_completed", message: result.summary });
    } catch (error) {
      emit({ type: "scan_completed", message: error instanceof Error ? error.message : "Watchtower scan failed.", severity: "high" });
    } finally { running = false; }
  };
  const watcher = chokidar.watch(repoPath, { ignored, ignoreInitial: true, persistent: true, awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 } });
  watcher.on("all", (_event, path) => {
    const file = relative(repoPath, path);
    emit({ type: "file_changed", message: `${file} changed.`, file });
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void run(file), 500);
  });
  await run();
  return { stop: async () => { if (timer) clearTimeout(timer); await watcher.close(); } };
}
