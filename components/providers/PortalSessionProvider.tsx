"use client";
/* eslint-disable react-hooks/set-state-in-effect -- one-time client storage hydration is intentional */

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  clearPortalSession,
  createEmptyPortalSession,
  loadPortalSession,
  savePortalSession,
  type CompareSessionState,
  type IntegrationSessionState,
  type PortalSession,
  type ReportsSessionState,
  type WatchtowerSessionState,
} from "@/lib/portal/portalSessionStore";

interface PortalSessionContextValue {
  session: PortalSession;
  hydrated: boolean;
  updateSession: (patch: Partial<PortalSession>) => void;
  updateWatchtower: (patch: Partial<WatchtowerSessionState>) => void;
  updateReports: (patch: Partial<ReportsSessionState>) => void;
  updateCompare: (patch: Partial<CompareSessionState>) => void;
  updateIntegrations: (patch: Partial<IntegrationSessionState>) => void;
  saveCurrentPageState: (path: string, data: Record<string, unknown>) => void;
  clearSession: () => void;
}

const PortalSessionContext = createContext<PortalSessionContextValue | null>(null);

export function PortalSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<PortalSession>(createEmptyPortalSession);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSession(loadPortalSession());
    setHydrated(true);
  }, []);

  const commit = useCallback((updater: (current: PortalSession) => PortalSession) => {
    setSession((current) => {
      const next = { ...updater(current), updatedAt: new Date().toISOString() };
      savePortalSession(next);
      return next;
    });
  }, []);

  const updateSession = useCallback((patch: Partial<PortalSession>) => commit((current) => ({ ...current, ...patch })), [commit]);
  const updateWatchtower = useCallback((patch: Partial<WatchtowerSessionState>) => commit((current) => ({ ...current, watchtower: { ...current.watchtower, ...patch } })), [commit]);
  const updateReports = useCallback((patch: Partial<ReportsSessionState>) => commit((current) => ({ ...current, reports: { ...current.reports, ...patch } })), [commit]);
  const updateCompare = useCallback((patch: Partial<CompareSessionState>) => commit((current) => ({ ...current, compare: { ...current.compare, ...patch } })), [commit]);
  const updateIntegrations = useCallback((patch: Partial<IntegrationSessionState>) => commit((current) => ({ ...current, integrations: { ...current.integrations, ...patch } })), [commit]);
  const saveCurrentPageState = useCallback((path: string, data: Record<string, unknown>) => commit((current) => ({ ...current, pages: { ...current.pages, [path]: { path, data, updatedAt: new Date().toISOString() } } })), [commit]);
  const clearSession = useCallback(() => {
    clearPortalSession();
    setSession(createEmptyPortalSession());
  }, []);

  const value = useMemo(() => ({ session, hydrated, updateSession, updateWatchtower, updateReports, updateCompare, updateIntegrations, saveCurrentPageState, clearSession }), [session, hydrated, updateSession, updateWatchtower, updateReports, updateCompare, updateIntegrations, saveCurrentPageState, clearSession]);
  return <PortalSessionContext.Provider value={value}>{children}</PortalSessionContext.Provider>;
}

export function usePortalSession() {
  const value = useContext(PortalSessionContext);
  if (!value) throw new Error("usePortalSession must be used inside PortalSessionProvider.");
  return value;
}
