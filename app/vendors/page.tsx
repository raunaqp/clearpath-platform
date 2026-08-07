"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, FileCheck2, Target, ShieldCheck } from "lucide-react";
import { useRole } from "@/lib/role/RoleContext";
import { REGULATORY_URL } from "@/lib/links";

/**
 * Vendors door — a landing page for the evaluation → deployment flow, with a
 * regulatory on-ramp value prop that links out to the upstream product. Copy is
 * fixed; sets the vendor role on entry.
 */

export default function VendorsDoor() {
  const { setRole } = useRole();
  useEffect(() => { setRole("vendor"); }, [setRole]);

  return (
    <div className="space-y-16 pb-8">
      {/* Hero */}
      <header className="max-w-3xl space-y-5 pt-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#BA7517]">For vendors</p>
        <h1 className="font-serif text-4xl leading-[1.06] text-ink sm:text-5xl">
          From readiness card to a hospital that'll run it.
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-ink-2">
          Submit your tool, get a calibrated readiness verdict, and send a request to the best-fit
          hospital — as a trial or a deployment. Need regulatory readiness first? Start there.
        </p>
        <div className="pt-1">
          <Link href="/submit" className="inline-flex items-center gap-2 rounded-md bg-teal-deep px-5 py-2.5 text-sm text-white transition-opacity hover:opacity-90">
            Submit a tool <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {/* Value props */}
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-card border border-line bg-bg-card p-5">
          <FileCheck2 className="h-6 w-6 text-teal-deep" />
          <p className="mt-3 text-sm leading-relaxed text-ink">
            <span className="font-medium">A calibrated readiness card</span>
            <span className="text-ink-2"> — 17 gates, 4 dimensions, honest conditions.</span>
          </p>
        </div>
        <div className="rounded-card border border-line bg-bg-card p-5">
          <Target className="h-6 w-6 text-teal-deep" />
          <p className="mt-3 text-sm leading-relaxed text-ink">
            <span className="font-medium">Matched to a best-fit hospital</span>
            <span className="text-ink-2"> — by level of care and what they're seeking.</span>
          </p>
        </div>
        {/* Regulatory on-ramp — links out (new tab) */}
        <a
          href={REGULATORY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex flex-col rounded-card border border-teal-deep/30 bg-teal-light/40 p-5 transition-colors hover:bg-teal-light"
        >
          <div className="flex items-center justify-between">
            <ShieldCheck className="h-6 w-6 text-teal-deep" />
            <ArrowUpRight className="h-4 w-4 text-teal-deep transition-transform group-hover:translate-x-0.5" />
          </div>
          <p className="mt-3 text-sm leading-relaxed text-ink">
            <span className="font-medium">Regulatory on-ramp</span>
            <span className="text-ink-2"> — sort CDSCO/DPDP readiness first if you need to.</span>
          </p>
          <span className="mt-2 text-xs text-muted">Opens ClearPath Regulatory in a new tab.</span>
        </a>
      </section>
    </div>
  );
}
