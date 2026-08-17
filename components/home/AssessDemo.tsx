"use client";

import { useEffect, useState } from "react";
import { ApplicationList, type Row } from "@/components/hospital/ApplicationList";
import { getSubmissions, getVendors, getTool, getReadinessCard } from "@/lib/mock/api";
import { PreviewSpinner } from "./SiteReadinessDemo";

/**
 * Demo for brief §3.4 — audit trail and scorecard.
 *
 * Renders the REAL <ApplicationList>: the "Assess tool applications" view,
 * tools grouped by category with their verdict chips (Deploy / Deploy with
 * conditions / Not yet) and pilot status. Same component `/hospital` renders.
 *
 * Wired to the Northvale fixture, which the seed data gives four submissions
 * across three categories, so the grouping is visible rather than a single row.
 * The handlers are no-ops: the preview frame swallows clicks, and a marketing
 * page must never mutate demo state.
 */
const HOSPITAL_ID = "hosp-northvale";
const noop = () => {};

export function AssessDemo() {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    let live = true;
    void (async () => {
      const [subs, vendors] = await Promise.all([getSubmissions(HOSPITAL_ID), getVendors()]);
      const resolved = await Promise.all(
        subs.map(async (submission) => {
          const [tool, card] = await Promise.all([
            getTool(submission.toolId),
            getReadinessCard(submission.readinessCardId),
          ]);
          const vendor = tool ? vendors.find((v) => v.id === tool.vendorId) ?? null : null;
          return { submission, tool: tool ?? null, vendor, verdict: card?.verdict ?? null };
        })
      );
      if (!live) return;
      resolved.sort((a, b) => b.submission.createdAt.localeCompare(a.submission.createdAt));
      setRows(resolved);
    })();
    return () => {
      live = false;
    };
  }, []);

  if (!rows) return <PreviewSpinner />;
  return (
    <ApplicationList
      active={rows.filter((r) => !r.submission.skipped)}
      skipped={rows.filter((r) => r.submission.skipped)}
      busy={null}
      onSkip={noop}
      onUnskip={noop}
    />
  );
}
