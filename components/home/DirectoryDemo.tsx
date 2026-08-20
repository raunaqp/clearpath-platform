"use client";

import { useEffect, useState } from "react";
import type { RegistryToolView } from "@/lib/registry";
import { RegistryTable } from "@/components/registry/RegistryTable";
import { getRegistryView } from "@/lib/mock/api";
import { PreviewSpinner } from "./SiteReadinessDemo";

/**
 * Demo for brief §3.1 — discover and compare.
 *
 * Renders the REAL <RegistryTable>: tools side by side with verdict, CDSCO
 * class, status, and where each has run. Same component and same data path as
 * `/registry`, unfiltered — the brief asks for "a trimmed version" of the
 * directory view, and the trim here is the preview frame's clip rather than a
 * different table.
 */
export function DirectoryDemo() {
  const [rows, setRows] = useState<RegistryToolView[] | null>(null);

  useEffect(() => {
    let live = true;
    void getRegistryView().then((r) => {
      if (live) setRows(r);
    });
    return () => {
      live = false;
    };
  }, []);

  if (!rows) return <PreviewSpinner />;
  return <RegistryTable rows={rows} />;
}
