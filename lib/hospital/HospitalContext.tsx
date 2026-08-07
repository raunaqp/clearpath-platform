"use client";

/**
 * Hospital PERSONA state — the "Viewing as: [Hospital]" switch that sits one
 * level below the Vendor/Hospital role toggle. Switching persona swaps the whole
 * hospital context (inbox, site-readiness, actions). Persisted to localStorage so
 * the chosen institution survives navigation; cleared by "Reset demo data".
 */
import { createContext, useContext, useEffect, useState } from "react";
import { DEFAULT_PERSONA } from "./personas";

export const HOSPITAL_STORAGE_KEY = "clearpath-hospital";

type HospitalContextValue = {
  hospitalId: string;
  setHospitalId: (id: string) => void;
};

const HospitalContext = createContext<HospitalContextValue | null>(null);

export function HospitalProvider({ children }: { children: React.ReactNode }) {
  const [hospitalId, setState] = useState<string>(DEFAULT_PERSONA);

  // Hydrate after mount (avoids SSR/client mismatch).
  useEffect(() => {
    const saved = window.localStorage.getItem(HOSPITAL_STORAGE_KEY);
    if (saved) setState(saved);
  }, []);

  const setHospitalId = (id: string) => {
    setState(id);
    window.localStorage.setItem(HOSPITAL_STORAGE_KEY, id);
  };

  return (
    <HospitalContext.Provider value={{ hospitalId, setHospitalId }}>
      {children}
    </HospitalContext.Provider>
  );
}

export function useHospital(): HospitalContextValue {
  const ctx = useContext(HospitalContext);
  if (!ctx) throw new Error("useHospital must be used within <HospitalProvider>");
  return ctx;
}
