"use client";

import { useActionState } from "react";
import { createOffer, type OfferFormState } from "@/app/g/[id]/offers/actions";
import {
  CATEGORY_LABEL_HE,
  type OfferCategory,
  type Program,
} from "@/lib/types";

const SHAREABILITY_CHOICES = [
  {
    value: "transferable",
    title: "אפשר להעביר",
    help: "החבר קונה או מזמין, ומעביר לכם. כרטיסים למופע, שובר מתנה.",
  },
  {
    value: "presence_required",
    title: "צריך שיהיה נוכח",
    help: "ההנחה נכנסת עם הכרטיס שלו בקופה, אז הוא צריך להיות שם.",
  },
  {
    value: "personal_only",
    title: "אישי בלבד",
    help: "שייך רק לחבר עצמו ולא ניתן להעברה. מענקים, הטבות מס.",
  },
] as const;

export default function NewOfferForm({
  groupId,
  programs,
}: {
  groupId: string;
  programs: Program[];
}) {
  const [state, formAction, pending] = useActionState<OfferFormState, FormData>(
    createOffer,
    {},
  );

  return (
    <form action={formAction} className="mt-6 space-y-5">
      <input type="hidden" name="group_id" value={groupId} />

      <div>
        <label className="label" htmlFor="program_id">
          מאיזה מועדון?
        </label>
        <select id="program_id" name="program_id" className="field" required defaultValue="">
          <option value="" disabled>
            בחרו מועדון
          </option>
          {programs.map((program) => (
            <option key={program.id} value={program.id}>
              {program.emoji} {program.name_he}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="title_he">
          מה ההטבה?
        </label>
        <input
          id="title_he"
          name="title_he"
          className="field"
          required
          placeholder="כרטיסים להצגה במחיר מוזל"
        />
      </div>

      <div>
        <label className="label" htmlFor="merchant">
          בית העסק
        </label>
        <input id="merchant" name="merchant" className="field" required placeholder="הבימה" />
      </div>

      <div>
        <label className="label" htmlFor="discount_text">
          כמה חוסכים?
        </label>
        <input
          id="discount_text"
          name="discount_text"
          className="field"
          required
          placeholder="30% הנחה / 2 כרטיסים ב-99 ₪"
        />
      </div>

      <fieldset>
        <legend className="label">אפשר לבקש את זה מחבר?</legend>
        <p className="mb-2 text-xs text-ink-faint">
          זה קובע איזה כפתור יופיע לשאר הקבוצה.
        </p>
        <div className="space-y-2">
          {SHAREABILITY_CHOICES.map((choice) => (
            <label
              key={choice.value}
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50"
            >
              <input
                type="radio"
                name="shareability"
                value={choice.value}
                required
                className="mt-0.5 size-4 accent-brand-600"
              />
              <span>
                <span className="block font-semibold">{choice.title}</span>
                <span className="block text-xs text-ink-muted">{choice.help}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label className="label" htmlFor="category">
          קטגוריה
        </label>
        <select id="category" name="category" className="field" defaultValue="other">
          {(Object.keys(CATEGORY_LABEL_HE) as OfferCategory[]).map((category) => (
            <option key={category} value={category}>
              {CATEGORY_LABEL_HE[category]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="valid_until">
          בתוקף עד (לא חובה)
        </label>
        <input id="valid_until" name="valid_until" type="date" className="field" dir="ltr" />
      </div>

      <div>
        <label className="label" htmlFor="description_he">
          פרטים נוספים (לא חובה)
        </label>
        <textarea
          id="description_he"
          name="description_he"
          className="field min-h-20"
          placeholder="תנאים, קוד קופון, סניפים משתתפים…"
        />
      </div>

      <div>
        <label className="label" htmlFor="source_url">
          קישור (לא חובה)
        </label>
        <input
          id="source_url"
          name="source_url"
          type="url"
          className="field text-start"
          dir="ltr"
          placeholder="https://…"
        />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? "שומר…" : "הוסיפו לקבוצה"}
      </button>
    </form>
  );
}
