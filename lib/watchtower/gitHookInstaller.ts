import { access, chmod, copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { validateWatchtowerRepoPath } from "./watchtowerValidation.ts";

const hookContent = `#!/bin/sh
echo "Running Agent Watchtower commit gate..."
npm run watchtower -- scan --repo . --commit-gate
STATUS=$?
if [ "$STATUS" -ne 0 ]; then
  echo "Agent Watchtower blocked this commit."
  exit 1
fi
exit 0
`;

async function exists(path: string) {
  try { await access(path); return true; } catch { return false; }
}

export async function installWatchtowerPreCommitHook(repoPath: string): Promise<{
  installed: boolean;
  hookPath: string;
  message: string;
}> {
  const resolved = await validateWatchtowerRepoPath(repoPath);
  const hooksDirectory = join(resolved, ".git", "hooks");
  const hookPath = join(hooksDirectory, "pre-commit");
  const backupPath = join(hooksDirectory, "pre-commit.agent-watchtower.bak");
  if (!(await exists(join(resolved, ".git"))) || !(await exists(hooksDirectory))) {
    return { installed: false, hookPath, message: "No local .git/hooks directory was found." };
  }
  await mkdir(hooksDirectory, { recursive: true });
  if (await exists(hookPath)) {
    const current = await readFile(hookPath, "utf8");
    if (current === hookContent) return { installed: true, hookPath, message: "Agent Watchtower pre-commit gate is already installed." };
    await copyFile(hookPath, backupPath);
  }
  await writeFile(hookPath, hookContent, "utf8");
  await chmod(hookPath, 0o755);
  return { installed: true, hookPath, message: await exists(backupPath) ? `Installed Watchtower gate. Existing hook backed up to ${backupPath}.` : "Installed Agent Watchtower pre-commit gate." };
}
