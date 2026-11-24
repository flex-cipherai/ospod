"use client";

import { useActionState } from "react";
import { buttonClass, Field } from "@/components/ui";
import { renameWorkspace, updateProfile, type SettingsState } from "./actions";

function Status({ state }: { state: SettingsState }) {
  return (
    <p role="status" className={state.error ? "text-sm text-danger" : "text-sm text-success"}>
      {state.error ?? state.ok ?? ""}
    </p>
  );
}

export function ProfileForm({ fullName, email }: { fullName: string; email: string }) {
  const [state, action, pending] = useActionState(updateProfile, {});
  return (
    <form action={action} className="space-y-5">
      <Field id="full_name" label="Your name" defaultValue={fullName} autoComplete="name" required maxLength={120} />
      <Field id="email" label="Email" defaultValue={email} disabled hint="Your sign-in email. Contact support to change it." />
      <div className="flex items-center gap-4">
        <button type="submit" disabled={pending} className={buttonClass()}>
          {pending ? "Saving…" : "Save"}
        </button>
        <Status state={state} />
      </div>
    </form>
  );
}

export function WorkspaceForm({ name, canEdit }: { name: string; canEdit: boolean }) {
  const [state, action, pending] = useActionState(renameWorkspace, {});
  return (
    <form action={action} className="space-y-5">
      <Field
        id="name"
        label="Workspace name"
        defaultValue={name}
        required
        maxLength={80}
        disabled={!canEdit}
        hint={canEdit ? "Your team sees this name." : "Only the owner or an admin can change this."}
      />
      {canEdit && (
        <div className="flex items-center gap-4">
          <button type="submit" disabled={pending} className={buttonClass()}>
            {pending ? "Saving…" : "Save"}
          </button>
          <Status state={state} />
        </div>
      )}
    </form>
  );
}
