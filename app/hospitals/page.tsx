"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Scale, MapPin, ShieldCheck } from "lucide-react";
import { useRole } from "@/lib/role/RoleContext";

/**
 * Hospitals door — a landing page for the buyer flow. Copy is fixed; sets the
 * hospital role on entry. No vendor workflows.
 */
const VALUES = [
  { icon: Scale, lead: "Your own verdict, not the vendor's", rest: "an independent 13-gate intake audit." },
  { icon: MapPin, lead: "Placement & readiness", rest: "know if this tool fits your site before you commit." },
  { icon: ShieldCheck, lead: "Run it properly", rest: "trial or deployment, monitored, documented, owned." },
];

export default function HospitalsDoor() {
  const { setRole } = useRole();
  useEffect(() => { setRole("hospital"); }, [setRole]);

  return (
    <div className="space-y-16 pb-8">
      {/* Hero */}
      <header className="max-w-3xl space-y-5 pt-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#BA7517]">For hospitals</p>
        <h1 className="font-serif text-4xl leading-[1.06] text-ink sm:text-5xl">
          Stop running pilots that go nowhere.
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-ink-2">
          Review the AI tools vendors send you, run your own independent audit, check whether
          you're ready to host, and run the trial or deployment end-to-end — with a named owner
          at the end.
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Link href="/hospital" className="inline-flex items-center gap-2 rounded-md bg-teal-deep px-5 py-2.5 text-sm text-white transition-opacity hover:opacity-90">
            Open your inbox <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/site-readiness" className="inline-flex items-center gap-2 rounded-md border border-line px-5 py-2.5 text-sm text-ink-2 transition-colors hover:bg-bg-sink">
            Check our site readiness
          </Link>
        </div>
      </header>

      {/* Value props */}
      <section className="grid gap-4 sm:grid-cols-3">
        {VALUES.map((v) => (
          <div key={v.lead} className="rounded-card border border-line bg-bg-card p-5">
            <v.icon className="h-6 w-6 text-teal-deep" />
            <p className="mt-3 text-sm leading-relaxed text-ink">
              <span className="font-medium">{v.lead}</span>
              <span className="text-ink-2"> — {v.rest}</span>
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}
