"use client";

import AskButton from "./AskButton";
import { expiryLabelHe, initials, isExpiringSoon } from "@/lib/format";
import {
  CATEGORY_LABEL_HE,
  SHAREABILITY_LABEL_HE,
  type OfferWithHolders,
} from "@/lib/types";

const SHAREABILITY_STYLE: Record<string, string> = {
  transferable: "bg-emerald-50 text-emerald-700",
  presence_required: "bg-amber-50 text-amber-700",
  personal_only: "bg-slate-100 text-slate-600",
};

export default function OfferCard({
  offer,
  currentUserId,
  askerName,
  groupId,
  siteUrl,
  highlighted,
}: {
  offer: OfferWithHolders;
  currentUserId: string;
  askerName: string;
  groupId: string;
  siteUrl: string;
  highlighted: boolean;
}) {
  const expiry = expiryLabelHe(offer.valid_until);
  const soon = isExpiringSoon(offer.valid_until);

  const youHoldIt = offer.holders.some((holder) => holder.id === currentUserId);
  const othersWhoHoldIt = offer.holders.filter((holder) => holder.id !== currentUserId);
  const nobodyHasIt = offer.holders.length === 0;

  return (
    <article
      className={`card p-4 ${highlighted ? "ring-2 ring-brand-500" : ""} ${
        nobodyHasIt ? "opacity-75" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-xl text-xl"
          style={{ backgroundColor: `${offer.program.color}1a` }}
          aria-hidden
        >
          {offer.program.emoji}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold" style={{ color: offer.program.color }}>
            {offer.program.name_he}
          </p>
          <h3 className="mt-0.5 font-bold leading-snug">{offer.title_he}</h3>
          <p className="mt-0.5 text-sm text-ink-muted">{offer.merchant}</p>
        </div>
      </div>

      <p className="mt-3 text-lg font-bold text-brand-700">
        <bdi>{offer.discount_text}</bdi>
      </p>

      {offer.description_he && (
        <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{offer.description_he}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className={`rounded-full px-2.5 py-1 font-medium ${SHAREABILITY_STYLE[offer.shareability]}`}>
          {SHAREABILITY_LABEL_HE[offer.shareability]}
        </span>
        <span className="rounded-full bg-surface-sunken px-2.5 py-1 text-ink-muted">
          {CATEGORY_LABEL_HE[offer.category]}
        </span>
        {expiry && (
          <span
            className={`rounded-full px-2.5 py-1 font-medium ${
              soon ? "bg-red-50 text-red-700" : "bg-surface-sunken text-ink-muted"
            }`}
          >
            <bdi>{expiry}</bdi>
          </span>
        )}
      </div>

      {/* Who in this group can actually unlock it - the question the app exists for. */}
      <div className="mt-4 border-t border-line pt-3">
        {nobodyHasIt ? (
          <div>
            <p className="text-sm text-ink-muted">
              אף אחד בקבוצה לא חבר ב{offer.program.name_he}.
            </p>
            {offer.program.join_url && (
              <a
                href={offer.program.join_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-sm font-semibold text-brand-600 underline"
              >
                כדאי שמישהו יצטרף →
              </a>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2 space-x-reverse">
                {offer.holders.slice(0, 4).map((holder) => (
                  <span
                    key={holder.id}
                    title={holder.display_name}
                    className="flex size-7 items-center justify-center rounded-full border-2 border-surface bg-brand-100 text-[10px] font-bold text-brand-700"
                  >
                    {initials(holder.display_name)}
                  </span>
                ))}
              </div>
              <p className="text-sm text-ink-muted">
                {youHoldIt && othersWhoHoldIt.length === 0
                  ? "יש לכם את זה"
                  : `יש ל${offer.holders.map((h) => h.display_name).join(", ")}`}
              </p>
            </div>

            {offer.shareability === "personal_only" ? (
              <p className="mt-3 text-sm text-ink-faint">
                הטבה אישית — לא ניתן להעביר אותה למישהו אחר.
              </p>
            ) : othersWhoHoldIt.length === 0 ? (
              <p className="mt-3 text-sm text-ink-faint">
                ההטבה כבר שלכם — אין את מי לבקש.
              </p>
            ) : (
              <>
                <div className="mt-3 flex flex-wrap gap-2">
                  {othersWhoHoldIt.map((holder) => (
                    <AskButton
                      key={holder.id}
                      offer={offer}
                      holder={holder}
                      askerName={askerName}
                      groupId={groupId}
                      siteUrl={siteUrl}
                    />
                  ))}
                </div>
                {offer.costs_quota && (
                  <p className="mt-2 text-xs text-ink-faint">
                    ⚠️ שימוש בהטבה מנצל אחת מהזכאויות החודשיות של מי שתבקשו.
                  </p>
                )}
              </>
            )}
          </>
        )}
      </div>

      {offer.source_url && (
        <a
          href={offer.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block text-xs text-ink-faint underline"
        >
          פרטי ההטבה באתר המועדון
        </a>
      )}
    </article>
  );
}
