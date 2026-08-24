"use client";

import { useMemo, useState } from "react";
import OfferCard from "./OfferCard";
import {
  CATEGORY_LABEL_HE,
  type OfferCategory,
  type OfferWithHolders,
  type Program,
} from "@/lib/types";

/**
 * Matches the substring semantics of the pg_trgm index defined in
 * supabase/migrations/0001_init.sql, over the same title + merchant text. The
 * whole group feed is already loaded, so filtering here avoids a round trip;
 * the index backs the identical query server-side once a catalog outgrows that.
 */
function matches(offer: OfferWithHolders, query: string): boolean {
  if (!query) return true;
  const haystack = `${offer.title_he} ${offer.merchant}`.toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term));
}

export default function OfferFeed({
  offers,
  programs,
  currentUserId,
  askerName,
  groupId,
  siteUrl,
  highlightOfferId,
}: {
  offers: OfferWithHolders[];
  programs: Program[];
  currentUserId: string;
  askerName: string;
  groupId: string;
  siteUrl: string;
  highlightOfferId: string | null;
}) {
  const [query, setQuery] = useState("");
  const [categories, setCategories] = useState<Set<OfferCategory>>(new Set());
  const [programIds, setProgramIds] = useState<Set<string>>(new Set());
  const [onlyOurs, setOnlyOurs] = useState(false);

  // Only offer category chips that actually appear in this group's feed.
  const presentCategories = useMemo(() => {
    const seen = new Set<OfferCategory>();
    for (const offer of offers) seen.add(offer.category);
    return (Object.keys(CATEGORY_LABEL_HE) as OfferCategory[]).filter((c) => seen.has(c));
  }, [offers]);

  const presentPrograms = useMemo(() => {
    const seen = new Set(offers.map((offer) => offer.program_id));
    return programs.filter((program) => seen.has(program.id));
  }, [offers, programs]);

  const visible = useMemo(
    () =>
      offers.filter((offer) => {
        if (onlyOurs && offer.holders.length === 0) return false;
        if (categories.size > 0 && !categories.has(offer.category)) return false;
        if (programIds.size > 0 && !programIds.has(offer.program_id)) return false;
        return matches(offer, query.trim());
      }),
    [offers, onlyOurs, categories, programIds, query],
  );

  const gapCount = offers.filter((offer) => offer.holders.length === 0).length;

  function toggle<T>(setter: React.Dispatch<React.SetStateAction<Set<T>>>, value: T) {
    setter((current) => {
      const updated = new Set(current);
      if (updated.has(value)) updated.delete(value);
      else updated.add(value);
      return updated;
    });
  }

  const filtersActive =
    query.trim() !== "" || categories.size > 0 || programIds.size > 0 || onlyOurs;

  return (
    <section className="mt-6">
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="field"
        placeholder="חיפוש הטבה או בית עסק…"
        aria-label="חיפוש הטבות"
      />

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setOnlyOurs((value) => !value)}
          aria-pressed={onlyOurs}
          className={`chip ${onlyOurs ? "chip-on" : ""}`}
        >
          ✅ רק מה שיש לנו
        </button>

        {presentPrograms.map((program) => (
          <button
            key={program.id}
            type="button"
            onClick={() => toggle(setProgramIds, program.id)}
            aria-pressed={programIds.has(program.id)}
            className={`chip ${programIds.has(program.id) ? "chip-on" : ""}`}
          >
            <span aria-hidden>{program.emoji}</span>
            {program.name_he}
          </button>
        ))}

        {presentCategories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => toggle(setCategories, category)}
            aria-pressed={categories.has(category)}
            className={`chip ${categories.has(category) ? "chip-on" : ""}`}
          >
            {CATEGORY_LABEL_HE[category]}
          </button>
        ))}
      </div>

      <p className="mt-4 text-sm text-ink-muted">
        <bdi>{visible.length}</bdi> הטבות
        {gapCount > 0 && !onlyOurs && (
          <>
            {" · "}
            <bdi>{gapCount}</bdi> מהן אף אחד בקבוצה לא זכאי
          </>
        )}
      </p>

      {visible.length === 0 ? (
        <div className="card mt-4 p-8 text-center">
          <p className="text-3xl">🔍</p>
          <p className="mt-3 font-semibold">
            {filtersActive ? "אין הטבות שמתאימות לסינון" : "עדיין אין כאן הטבות"}
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            {filtersActive
              ? "נסו לנקות חלק מהמסננים."
              : "ראיתם הטבה באחת האפליקציות? הוסיפו אותה כדי שכל הקבוצה תדע."}
          </p>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {visible.map((offer) => (
            <li key={offer.id}>
              <OfferCard
                offer={offer}
                currentUserId={currentUserId}
                askerName={askerName}
                groupId={groupId}
                siteUrl={siteUrl}
                highlighted={offer.id === highlightOfferId}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
