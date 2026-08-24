/**
 * The five programs the app ships with.
 *
 * `slug` is the stable identity used for upserts, so re-running the seed
 * updates these rows rather than duplicating them.
 */
export interface SeedProgram {
  slug: string;
  name_he: string;
  category: "bank" | "credit" | "consumer" | "lottery" | "government";
  emoji: string;
  color: string;
  join_url: string;
  terms_url: string | null;
  notes_he: string;
  sort_order: number;
}

export const PROGRAMS: SeedProgram[] = [
  {
    slug: "leumi-bonus",
    name_he: "לאומי בונוס",
    category: "bank",
    emoji: "💳",
    color: "#0f4c8a",
    join_url: "https://www.leumi.co.il/he/bonus",
    terms_url: "https://bonus.leumi.co.il/product/22772",
    notes_he: "תוכנית ההטבות ותווי הקנייה למחזיקי כרטיסי אשראי של בנק לאומי.",
    sort_order: 10,
  },
  {
    slug: "hot-club",
    name_he: "מועדון צרכנות HOT",
    category: "consumer",
    emoji: "🛒",
    color: "#e4002b",
    join_url: "https://www.hot.co.il/",
    terms_url: null,
    notes_he:
      "מועדון צרכנות ללא דמי חבר, עם הנחות בכ-14,000 בתי עסק ורשתות בכל הארץ.",
    sort_order: 20,
  },
  {
    slug: "pais-plus",
    name_he: "מנוי הפיס · פיס פלוס",
    category: "lottery",
    emoji: "🎟️",
    color: "#0aa06e",
    join_url: "https://www.pais.co.il/info/paisplus.aspx",
    terms_url: "https://www.pais.co.il/info/mpais-faq.aspx",
    notes_he:
      "מועדון ההטבות של מנויי מפעל הפיס: הצגות, מופעים, סרטים, מסעדות ונופש.",
    sort_order: 30,
  },
  {
    slug: "miluim",
    name_he: "משרתי מילואים",
    category: "government",
    emoji: "🎖️",
    color: "#4a5d3a",
    join_url: "https://www.matzdiim.co.il/",
    terms_url: "https://www.miluim.idf.il/",
    notes_he:
      "מענקים והטבות מדינה למשרתי מילואים, לצד הנחות של בתי עסק ומועדונים.",
    sort_order: 40,
  },
  {
    slug: "amex-il",
    name_he: "American Express ישראל",
    category: "credit",
    emoji: "💠",
    color: "#006fcf",
    join_url: "https://he.americanexpress.co.il/",
    terms_url: null,
    notes_he:
      "מועדוני הכרטיס של אמריקן אקספרס: Membership Rewards, LifeStyle, מועדון הוט ועוד.",
    sort_order: 50,
  },
];
