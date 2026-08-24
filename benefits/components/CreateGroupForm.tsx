"use client";

import { useActionState } from "react";
import { createGroup, type GroupFormState } from "@/app/groups/actions";

export default function CreateGroupForm() {
  const [state, formAction, pending] = useActionState<GroupFormState, FormData>(
    createGroup,
    {},
  );

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <div>
        <label className="label" htmlFor="name">
          שם הקבוצה
        </label>
        <input
          id="name"
          name="name"
          className="field"
          required
          placeholder="החבר׳ה מהצבא"
        />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? "יוצר…" : "צרו קבוצה"}
      </button>
    </form>
  );
}
