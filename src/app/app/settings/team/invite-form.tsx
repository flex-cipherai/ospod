"use client";

import { useActionState, useState } from "react";
import { Check, Copy, Link2 } from "lucide-react";
import { clsx } from "clsx";
import { Label, Notice, buttonClass, inputClass } from "@/components/ui";
import { ROLE_HELP } from "@/lib/roles";
import { createInvite, type InviteState } from "./actions";

export function InviteForm() {
  const [state, action, pending] = useActionState<InviteState, FormData>(createInvite, {});
  const [role, setRole] = useState<keyof typeof ROLE_HELP>("editor");
  const [copied, setCopied] = useState(false);

  return (
    <div>
      <form action={action} className="grid gap-4 md:grid-cols-[minmax(0,1fr)_200px_auto] md:items-end">
        <div>
          <Label htmlFor="invite-email">Who's it for? (optional)</Label>
          <input id="invite-email" name="email" type="email" placeholder="name@example.com" className={inputClass} />
        </div>
        <div>
          <Label htmlFor="invite-role">Role</Label>
          <select
            id="invite-role"
            name="role"
            value={role}
            onChange={(e) => setRole(e.target.value as keyof typeof ROLE_HELP)}
            className={inputClass}
          >
            <option value="admin">Admin</option>
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
        </div>
        <button type="submit" disabled={pending} className={buttonClass()}>
          <Link2 size={18} aria-hidden="true" /> {pending ? "Creating…" : "Create invite link"}
        </button>
      </form>
      <p className="mt-2 text-sm text-muted">{ROLE_HELP[role]}</p>

      {state.error && <Notice tone="error" className="mt-4">{state.error}</Notice>}
      {state.link && (
        <div className="mt-5 rounded-xl border-l-[6px] border-gold bg-gold-soft/60 p-4">
          <p className="mb-2 text-[15px] font-semibold">Send this link to them. It works once and expires in 7 days.</p>
          <div className="flex gap-2">
            <input readOnly value={state.link} aria-label="Invite link" className={clsx(inputClass, "font-mono text-sm")} onFocus={(e) => e.target.select()} />
            <button
              type="button"
              className={buttonClass({ variant: "secondary" })}
              onClick={async () => {
                await navigator.clipboard.writeText(state.link!);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
