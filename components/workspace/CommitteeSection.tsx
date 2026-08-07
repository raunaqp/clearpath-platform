"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import type { Deployment } from "@/lib/schemas/deployment";
import { addRole } from "@/lib/mock/api";

/**
 * Committee section (Live screen) — add a person + role (mock, in memory). The
 * new member is appended to the deployment's workflow & roles list.
 */
export function CommitteeSection({
  deploymentId,
  onAdded,
}: {
  deploymentId: string;
  onAdded: (d: Deployment) => void;
}) {
  const [person, setPerson] = useState("");
  const [role, setRole] = useState("");
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!person.trim() || !role.trim()) return;
    setBusy(true);
    const d = await addRole(deploymentId, role.trim(), person.trim());
    setBusy(false);
    if (d) {
      onAdded(d);
      setPerson("");
      setRole("");
    }
  }

  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <p className="mb-2 text-sm text-ink">Add a committee member</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={person}
          onChange={(e) => setPerson(e.target.value)}
          placeholder="Name (e.g. Dr. A. Rao)"
          className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-muted sm:w-56"
        />
        <input
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="Role (e.g. Ethics reviewer)"
          className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-muted sm:w-56"
        />
        <button
          onClick={add}
          disabled={busy || !person.trim() || !role.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-teal-deep px-4 py-2 text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <UserPlus className="h-4 w-4" /> {busy ? "Adding…" : "Add"}
        </button>
      </div>
    </div>
  );
}
