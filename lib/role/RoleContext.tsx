"use client";

/**
 * Role switcher state (BUILD_SPEC §1). The top-level "Viewing as" toggle:
 * switching role changes the available nav, not the data. Persisted to
 * localStorage so the chosen lens survives a refresh.
 *
 * `signedIn` is the public-site restructure (brief §1): the public header
 * (Home · About · Framework + Login) shows until a persona is picked, after
 * which the header swaps to the existing product nav. It is a NAVIGATION lens
 * only — it gates nothing. Product routes stay reachable by direct URL with no
 * redirect, guard, or interstitial, exactly as before.
 */

import { createContext, useContext, useEffect, useState } from "react";

/**
 * Four actors. ClearPath and Assessor were missing, which misrepresented whose
 * screens the facilitation and the exception queue belong to — S11 has existed
 * since Phase 5 with no role to view it from.
 *
 * "vendor" keeps its storage value rather than being renamed to "innovator":
 * it is persisted in localStorage and read directly by the browser suite, and
 * a rename would be a data migration for a label change. The DISPLAY name is
 * Innovator.
 */
export type Role = "vendor" | "hospital" | "clearpath" | "assessor";

export const ALL_ROLES: Role[] = ["vendor", "clearpath", "hospital", "assessor"];

const STORAGE_KEY = "clearpath-role";
const SIGNED_IN_KEY = "clearpath-signed-in";

type RoleContextValue = {
  role: Role;
  setRole: (role: Role) => void;
  /** Has a persona been picked via Login? Drives which header renders. */
  signedIn: boolean;
  /** Pick a persona — sets the role and swaps to the product header. */
  signIn: (role: Role) => void;
  /** Return to the public site. Does not change the role or any data. */
  signOut: () => void;
};

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<Role>("vendor");
  const [signedIn, setSignedIn] = useState(false);

  // Hydrate from localStorage after mount (avoids SSR/client mismatch).
  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && (ALL_ROLES as string[]).includes(saved)) setRoleState(saved as Role);
    if (window.localStorage.getItem(SIGNED_IN_KEY) === "true") setSignedIn(true);
  }, []);

  const setRole = (next: Role) => {
    setRoleState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  };

  const signIn = (next: Role) => {
    setRole(next);
    setSignedIn(true);
    window.localStorage.setItem(SIGNED_IN_KEY, "true");
  };

  const signOut = () => {
    setSignedIn(false);
    window.localStorage.removeItem(SIGNED_IN_KEY);
  };

  return (
    <RoleContext.Provider value={{ role, setRole, signedIn, signIn, signOut }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within <RoleProvider>");
  return ctx;
}
