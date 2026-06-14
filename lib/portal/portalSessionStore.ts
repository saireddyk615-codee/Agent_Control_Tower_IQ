export interface PortalPageState {
  path: string;
  updatedAt: string;
  data: Record<string, unknown>;
}

export interface WatchtowerSessionState {
  repoPath: string;
  selectedChecks: string[];
  selectedFixIds: string[];
  lastResult: unknown | null;
  lastScanAt: string | null;
  lastPdfPath?: string;
  lastPatchPath?: string;
  lastPatchPreview?: string;
  lastJsonPath?: string;
  lastMarkdownPath?: string;
  lastApplyFixesResult?: {
    applied: { fixId: string; file: string; message: string }[];
    skipped: { fixId: string; reason: string }[];
  };
  lastError?: string | null;
  isScanRunning?: boolean;
  startedAt?: string;
}

export interface ReportsSessionState {
  repoPath: string;
  lastLoadedReport: unknown | null;
  lastLoadedAt: string | null;
  lastPdfPath?: string;
  lastError?: string | null;
}

export interface CompareSessionState {
  repoPaths: string[];
  lastComparison: unknown | null;
  lastComparedAt: string | null;
  lastError?: string | null;
}

export interface IntegrationSessionState {
  lastSelectedSection?: string;
  extensionPath?: string;
  vsixPath?: string;
  lastCommandCopied?: string;
}

export interface PortalSession {
  version: 1;
  updatedAt: string;
  activeRepoPath?: string;
  lastDecision?: "safe" | "needs_review" | "blocked";
  lastRiskScore?: number;
  lastFindingsCount?: number;
  watchtower: WatchtowerSessionState;
  reports: ReportsSessionState;
  compare: CompareSessionState;
  integrations: IntegrationSessionState;
  pages: Record<string, PortalPageState>;
}

export const PORTAL_SESSION_KEY = "agent-control-tower:portal-session";
const MAX_SESSION_SIZE = 1_500_000;

export function createEmptyPortalSession(): PortalSession {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    watchtower: { repoPath: "", selectedChecks: [], selectedFixIds: [], lastResult: null, lastScanAt: null },
    reports: { repoPath: "", lastLoadedReport: null, lastLoadedAt: null },
    compare: { repoPaths: [], lastComparison: null, lastComparedAt: null },
    integrations: {},
    pages: {},
  };
}

function normalizeSession(value: unknown): PortalSession {
  const empty = createEmptyPortalSession();
  if (!value || typeof value !== "object" || Array.isArray(value)) return empty;
  const session = value as Partial<PortalSession>;
  if (session.version !== 1) return empty;
  return {
    ...empty,
    ...session,
    version: 1,
    watchtower: { ...empty.watchtower, ...(session.watchtower ?? {}) },
    reports: { ...empty.reports, ...(session.reports ?? {}) },
    compare: { ...empty.compare, ...(session.compare ?? {}) },
    integrations: { ...empty.integrations, ...(session.integrations ?? {}) },
    pages: session.pages && typeof session.pages === "object" ? session.pages : {},
  };
}

export function loadPortalSession(): PortalSession {
  if (typeof window === "undefined") return createEmptyPortalSession();
  try {
    const stored = window.localStorage.getItem(PORTAL_SESSION_KEY);
    return stored ? normalizeSession(JSON.parse(stored)) : createEmptyPortalSession();
  } catch {
    window.localStorage.removeItem(PORTAL_SESSION_KEY);
    return createEmptyPortalSession();
  }
}

function compactSession(session: PortalSession): PortalSession {
  const result = session.watchtower.lastResult && typeof session.watchtower.lastResult === "object"
    ? session.watchtower.lastResult as Record<string, unknown>
    : null;
  const findings = result && Array.isArray(result.findings) ? result.findings.slice(0, 100) : [];
  const fixPlan = result && Array.isArray(result.fixPlan) ? result.fixPlan.slice(0, 100) : [];
  return {
    ...session,
    watchtower: {
      ...session.watchtower,
      lastResult: result
        ? {
            ...result,
            findings,
            fixPlan,
          }
        : null,
      lastPatchPreview: undefined,
    },
    reports: { ...session.reports, lastLoadedReport: null },
    compare: { ...session.compare, lastComparison: null },
    pages: {},
  };
}

export function savePortalSession(session: PortalSession): void {
  if (typeof window === "undefined") return;
  try {
    const next = { ...session, version: 1 as const, updatedAt: new Date().toISOString() };
    let serialized = JSON.stringify(next);
    if (serialized.length > MAX_SESSION_SIZE) serialized = JSON.stringify(compactSession(next));
    if (serialized.length <= MAX_SESSION_SIZE) window.localStorage.setItem(PORTAL_SESSION_KEY, serialized);
  } catch {
    // Persistence is best-effort and must never interrupt the local security workflow.
  }
}

export function patchPortalSession(patch: Partial<PortalSession>): PortalSession {
  const current = loadPortalSession();
  const next = normalizeSession({ ...current, ...patch, updatedAt: new Date().toISOString() });
  savePortalSession(next);
  return next;
}

export function clearPortalSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PORTAL_SESSION_KEY);
  } catch {
    // Clearing UI state must remain safe even when storage is unavailable.
  }
}

export function savePageState(path: string, data: Record<string, unknown>): void {
  const current = loadPortalSession();
  patchPortalSession({
    pages: {
      ...current.pages,
      [path]: { path, data, updatedAt: new Date().toISOString() },
    },
  });
}

export function loadPageState<T = Record<string, unknown>>(path: string): T | null {
  return (loadPortalSession().pages[path]?.data as T | undefined) ?? null;
}
