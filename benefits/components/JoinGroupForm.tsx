"use client";

import { useActionState } from "react";
import { joinGroup, type GroupFormState } from "@/app/groups/actions";

export default function JoinGroupForm({ code }: { code?: string }) {
  const [state, formAction, pending] = useActionState<GroupFormState, FormData>(
    joinGroup,
    {},
  );

  return (
    <form action={formAction} className="mt-6 space-y-4">
      {code ? (
        <input type="hidden" name="code" value={code} />
      ) : (
        <div>
          <label className="label" htmlFor="code">
            קוד הזמנה
          </label>
          <input
            id="code"
            name="code"
            className="field text-start font-mono tracking-[0.2em]"
            dir="ltr"
            required
            autoCapitalize="characters"
            placeholder="ABCD234XYZ"
          />
        </div>
      )}

      {code && (
        <p className="rounded-xl bg-surface-sunken px-4 py-3 text-center font-mono text-lg tracking-[0.2em]">
          <bdi>{code}</bdi>
        </p>
      )}

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? "מצטרף…" : "הצטרפו לקבוצה"}
      </button>
    </form>
  );
}
