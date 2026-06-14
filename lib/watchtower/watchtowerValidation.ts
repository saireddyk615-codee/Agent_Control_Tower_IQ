import { realpath } from "node:fs/promises";
import { basename } from "node:path";
import { RequestValidationError } from "../security/validateRequest.ts";
import type { WatchtowerConfig } from "../../types/security.ts";
import { validateRepoDirectory } from "./pathValidation.ts";

function list(value: unknown, label: string): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 100 || !value.every((item) => typeof item === "string" && item.length <= 500)) {
    throw new RequestValidationError(`${label} must be a bounded string array.`);
  }
  return value.map((item) => item.trim()).filter(Boolean);
}

export async function validateWatchtowerRepoPath(value: unknown): Promise<string> {
  if (typeof value !== "string" || value.length > 4_096) throw new RequestValidationError("Enter a valid project folder path.");
  const validation = validateRepoDirectory(value);
  if (!validation.ok || !validation.repoPath) throw new RequestValidationError(validation.error ?? "Choose a valid project folder.");
  try { return await realpath(validation.repoPath); } catch { throw new RequestValidationError(`Directory cannot be accessed: ${validation.repoPath}`); }
}

export async function watchtowerConfigFromBody(body: Record<string, unknown>): Promise<WatchtowerConfig> {
  const repoPath = await validateWatchtowerRepoPath(body.repoPath);
  const projectName = typeof body.projectName === "string" && body.projectName.trim() ? body.projectName.trim().slice(0, 240) : basename(repoPath);
  return {
    repoPath, projectName, watchMode: false, installGitHook: false,
    allowedFiles: list(body.allowedFiles, "allowedFiles"),
    blockedFiles: list(body.blockedFiles, "blockedFiles"),
    blockedTools: ["shell", "deploy", "publish", "credential-access"],
    approvalRequiredTools: ["write", "network", "dependency-install"],
    riskThreshold: 70,
  };
}
