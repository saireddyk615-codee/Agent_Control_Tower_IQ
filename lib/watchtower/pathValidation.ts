import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export function normalizeRepoPath(input: string): string {
  let value = String(input || "").trim();
  if (!value) return "";
  value = value.replace(/^(["'])(.*)\1$/, "$2").trim();
  if (value === "~") value = os.homedir();
  else if (value.startsWith("~/")) value = path.join(os.homedir(), value.slice(2));
  return path.resolve(value);
}

export function validateRepoDirectory(input: string): { ok: boolean; repoPath?: string; error?: string } {
  const repoPath = normalizeRepoPath(input);
  if (!repoPath) return { ok: false, error: "Enter a project folder path." };
  if (repoPath === path.parse(repoPath).root) return { ok: false, error: "Choose a project folder, not the filesystem root." };
  if (repoPath === os.homedir()) return { ok: false, error: "Choose a project folder, not your home folder." };
  try {
    if (!fs.existsSync(repoPath)) return { ok: false, error: `Directory does not exist: ${repoPath}` };
    if (!fs.statSync(repoPath).isDirectory()) return { ok: false, error: `Path is not a directory: ${repoPath}` };
  } catch {
    return { ok: false, error: `Directory cannot be accessed: ${repoPath}` };
  }
  return { ok: true, repoPath };
}
