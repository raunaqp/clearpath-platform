"use client";

/**
 * Role switcher state (BUILD_SPEC §1). The top-level "Viewing as" toggle:
 * switching role changes the available nav, not the data. Persisted to
 * localStorage so the chosen lens survives a refresh.
 */

import { createContext, useContext, useEffect, useState } from "react";

export type Role = "vendor" | "hospital";

const STORAGE_KEY = "clearpath-role";

type RoleContextValue = {
  role: Role;
  setRole: (role: Role) => void;
};

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<Role>("vendor");

  // Hydrate from localStorage after mount (avoids SSR/client mismatch).
  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "vendor" || saved === "hospital") setRoleState(saved);
  }, []);

  const setRole = (next: Role) => {
    setRoleState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  };

  return (
    <RoleContext.Provider value={{ role, setRole }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within <RoleProvider>");
  return ctx;
}
