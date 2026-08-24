"use client";

import { useActionState, useState } from "react";
import { saveOnboarding, type OnboardingState } from "@/app/onboarding/actions";
import { PROGRAM_CATEGORY_LABEL_HE, type Program } from "@/lib/types";

export default function OnboardingForm({
  programs,
  initialName,
  initialPhone,
  initialProgramIds,
  next,
}: {
  programs: Program[];
  initialName: string;
  initialPhone: string;
  initialProgramIds: string[];
  next: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initialProgramIds));
  const [state, formAction, pending] = useActionState<OnboardingState, FormData>(
    saveOnboarding,
    {},
  );

  function toggle(id: string) {
    setSelected((current) => {
      const updated = new Set(current);
      if (updated.has(id)) updated.delete(id);
      else updated.add(id);
      return updated;
    });
  }

  return (
    <form action={formAction} className="mt-6 space-y-6">
      <input type="hidden" name="next" value={next} />

      <div>
        <label className="label" htmlFor="display_name">
          איך קוראים לכם?
        </label>
        <input
          id="display_name"
          name="display_name"
          className="field"
          required
          defaultValue={initialName}
          placeholder="מיכאל"
        />
      </div>

      <div>
        <label className="label" htmlFor="phone">
          טלפון (לווטסאפ)
        </label>
        <input
          id="phone"
          name="phone"
          className="field text-start"
          dir="ltr"
          inputMode="tel"
          required
          defaultValue={initialPhone}
          placeholder="050-1234567"
        />
        <p className="mt-1.5 text-xs text-ink-faint">
          נראה רק לחברי הקבוצות שלכם.
        </p>
      </div>

      <div>
        <p className="label">באילו מועדונים אתם חברים?</p>
        <p className="mb-3 text-xs text-ink-faint">
          סמנו כל מה שיש לכם — ככל שתסמנו יותר, כך לקבוצה יש יותר.
        </p>

        <div className="space-y-2">
          {programs.map((program) => {
            const on = selected.has(program.id);
            return (
              <label
                key={program.id}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                  on ? "border-brand-500 bg-brand-50" : "border-line bg-surface"
                }`}
              >
                <input
                  type="checkbox"
                  name="program_id"
                  value={program.id}
                  checked={on}
                  onChange={() => toggle(program.id)}
                  className="size-5 accent-brand-600"
                />
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg text-lg"
                  style={{ backgroundColor: `${program.color}1a` }}
                  aria-hidden
                >
                  {program.emoji}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{program.name_he}</span>
                  <span className="block text-xs text-ink-faint">
                    {PROGRAM_CATEGORY_LABEL_HE[program.category]}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? "שומר…" : "אפשר להתחיל"}
      </button>
    </form>
  );
}
