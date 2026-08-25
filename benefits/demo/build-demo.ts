/**
 * Generates the standalone demo page from the repo's own seed catalog.
 *
 * The demo has to show what the real app shows, so the offers are imported from
 * supabase/seed/*, never retyped. Output is an Artifact-shaped HTML fragment
 * (no <html>/<head>/<body> - those are supplied at publish time).
 *
 *   npm run demo
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PROGRAMS } from "../supabase/seed/programs";
import { OFFERS } from "../supabase/seed/offers";

// ---------------------------------------------------------------------------
// The demo group: the five friends from the original brief, arranged so every
// state in the UI appears. Nobody holds American Express, which is deliberate -
// its offers become the gap-analysis cards.
// ---------------------------------------------------------------------------
interface DemoMember {
  id: string;
  name: string;
  you?: boolean;
  programs: string[];
}

const MEMBERS: DemoMember[] = [
  { id: "u1", name: "מיכאל", you: true, programs: ["leumi-bonus", "miluim"] },
  { id: "u2", name: "דנה", programs: ["pais-plus"] },
  { id: "u3", name: "יוסי", programs: ["hot-club"] },
  { id: "u4", name: "נועה", programs: ["pais-plus"] },
  { id: "u5", name: "אורי", programs: ["miluim"] },
];

const GROUP_NAME = "החבר׳ה";

// ---------------------------------------------------------------------------
// Colour helpers.
//
// Program colours are brand colours picked for a light background (Leumi navy
// #0f4c8a, for one). On a dark ground they fail contrast, so each card carries
// both a light and a lightened variant as inline custom properties, and the
// theme blocks choose between them. Both are always defined, so there is no
// state where a colour is missing.
// ---------------------------------------------------------------------------
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    const v = l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
    return Math.round(v * 255).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/** Raise lightness and tame saturation so the hue survives on a dark ground. */
function lightenForDark(hex: string): string {
  const [h, s, l] = rgbToHsl(...hexToRgb(hex));
  return hslToHex(h, Math.min(s, 0.72), Math.max(l, 0.68));
}

function softRgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ---------------------------------------------------------------------------
// Build the feed rows: an offer joined with its program and the members holding
// that program, mirroring the group_offers() SQL function.
// ---------------------------------------------------------------------------
const programBySlug = new Map(PROGRAMS.map((p) => [p.slug, p]));

const rows = OFFERS.map((offer) => {
  const program = programBySlug.get(offer.program_slug);
  if (!program) throw new Error(`unknown program: ${offer.program_slug}`);

  const holders = MEMBERS.filter((m) => m.programs.includes(offer.program_slug)).map(
    (m) => ({ id: m.id, name: m.name, you: Boolean(m.you) }),
  );

  return {
    id: offer.seed_key,
    title: offer.title_he,
    merchant: offer.merchant,
    category: offer.category,
    discount: offer.discount_text,
    description: offer.description_he,
    shareability: offer.shareability,
    costsQuota: Boolean(offer.costs_quota),
    sourceUrl: offer.source_url,
    program: {
      slug: program.slug,
      name: program.name_he,
      emoji: program.emoji,
      color: program.color,
      colorDark: lightenForDark(program.color),
      soft: softRgba(program.color, 0.13),
      softDark: softRgba(lightenForDark(program.color), 0.16),
      joinUrl: program.join_url,
    },
    holders,
  };
});

// Same ordering as the SQL: actionable first, then merely held, then by title.
const rank = (r: (typeof rows)[number]) => {
  const held = r.holders.length > 0;
  const askable = held && r.shareability !== "personal_only";
  return askable ? 0 : held ? 1 : 2;
};
rows.sort((a, b) => rank(a) - rank(b) || a.title.localeCompare(b.title, "he"));

const data = {
  groupName: GROUP_NAME,
  members: MEMBERS.map(({ id, name, you }) => ({ id, name, you: Boolean(you) })),
  offers: rows,
};

// ---------------------------------------------------------------------------
const here = new URL(".", import.meta.url).pathname;
const template = readFileSync(join(here, "template.html"), "utf8");
const html = template.replace(
  "/*{{DATA}}*/null",
  JSON.stringify(data).replace(/</g, "\\u003c"),
);
writeFileSync(join(here, "index.html"), html);

const byProgram = rows.reduce<Record<string, number>>((acc, r) => {
  acc[r.program.slug] = (acc[r.program.slug] ?? 0) + 1;
  return acc;
}, {});
console.log(`offers: ${rows.length}`);
console.log("per program:", byProgram);
console.log(`gap offers (nobody holds): ${rows.filter((r) => r.holders.length === 0).length}`);
console.log(`quota-consuming: ${rows.filter((r) => r.costsQuota).length}`);
