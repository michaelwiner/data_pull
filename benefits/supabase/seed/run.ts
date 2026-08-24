/**
 * Seeds the programs and the starter offer catalog.
 *
 * Uses the service role key, which bypasses RLS - global offers (group_id NULL)
 * cannot be written through the public API by design, so this is the only way
 * they get in. Run it from a trusted machine, never from the browser.
 *
 *   npm run seed
 */
import { createClient } from "@supabase/supabase-js";
import { PROGRAMS } from "./programs";
import { OFFERS } from "./offers";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Copy .env.example to .env.local and fill them in.",
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

async function main() {
  // Upsert on slug so re-running updates the existing programs in place.
  const { data: programs, error: programError } = await supabase
    .from("programs")
    .upsert(PROGRAMS, { onConflict: "slug" })
    .select("id, slug");

  if (programError) throw programError;
  console.log(`programs: ${programs?.length ?? 0} upserted`);

  const idBySlug = new Map((programs ?? []).map((p) => [p.slug, p.id]));

  const rows = OFFERS.map((offer) => {
    const programId = idBySlug.get(offer.program_slug);
    if (!programId) {
      throw new Error(
        `offer "${offer.seed_key}" refers to unknown program "${offer.program_slug}"`,
      );
    }
    return {
      seed_key: offer.seed_key,
      program_id: programId,
      // Global and authorless: this is what marks a row as seed rather than a
      // member contribution, and the CHECK constraint enforces the pairing.
      group_id: null,
      created_by: null,
      title_he: offer.title_he,
      merchant: offer.merchant,
      category: offer.category,
      discount_text: offer.discount_text,
      description_he: offer.description_he,
      shareability: offer.shareability,
      costs_quota: offer.costs_quota ?? false,
      source_url: offer.source_url,
      status: "active" as const,
    };
  });

  const { data: offers, error: offerError } = await supabase
    .from("offers")
    .upsert(rows, { onConflict: "seed_key" })
    .select("id");

  if (offerError) throw offerError;
  console.log(`offers:   ${offers?.length ?? 0} upserted`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
