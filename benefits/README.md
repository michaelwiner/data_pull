# הטבות ביחד — Group Benefits App

Israelis each carry a different scattered set of membership benefits. Apps like
FID answer *"which of my cards is best?"*. This one answers a question nobody
else does: **"what can my friends unlock for me?"**

Everyone in a group declares their memberships. The group sees the combined
offer pool, each offer tagged with **who in the group can actually get it**, and
one tap opens WhatsApp to ask that person.

Hebrew-first, RTL, mobile-first.

---

## The idea in one screen

```
🎟️  מנוי הפיס · פיס פלוס
    כרטיסים להצגות
    תיאטראות והיכלי תרבות
    מחיר מנויים
    [ניתן להעברה] [תרבות ובידור]
    ─────────────────────────────
    (מ) יש למיכאל
    [💬 בקשו ממיכאל]        ← opens WhatsApp, message pre-filled
```

---

## Shareability: the idea the whole UI turns on

Not every benefit can be passed to a friend, and pretending otherwise would make
the app lie to people. Every offer carries one of three values:

| Value | Example | What the card does |
|---|---|---|
| `transferable` | פיס פלוס show tickets, gift vouchers | **"בקשו ממיכאל"** — he buys through his account and forwards it. Works remotely. |
| `presence_required` | HOT club / לאומי בונוס discount at the register | **"תאמו עם מיכאל"** — his card at the till, so he has to be there. |
| `personal_only` | מילואים tax credits and grants | **No button at all.** Shown for awareness, marked "אישי בלבד". |

Many club terms state benefits are personal and non-transferable, so the app
surfaces a disclaimer and this flag keeps it honest.

---

## Where the offers come from

**Curated, not scraped.** The research behind that:

- No Israeli benefit club exposes a public API.
- `paisplus.co.il` returns **HTTP 403 "Security Violation"** to this project's
  build environment, and `pais.co.il` resets the TLS connection outright — an
  IP-level WAF block, which a real Chromium hits identically. Those pages are
  public and load fine from a normal Israeli connection; they are simply not
  reachable from a datacenter, and working around that would mean evading an
  access control rather than reading a public page.
- `bonus.leumi.co.il` and `rewards.americanexpress.co.il` are JavaScript-rendered
  SPAs — a plain fetch returns only the page shell.
- **FID / FinDiscount** is mobile-only, with no web listing, API, or export. Its
  200+ club catalog is its paid product; extracting it is out of scope.

So the catalog has two sources:

1. **Seed** (`supabase/seed/offers.ts`) — 75 offers across the five programs,
   each carrying the public `source_url` it came from. The Pais Plus set is
   venue-level and concrete (cinema at 9 ₪ on Thursdays, ספארי רמת גן at 60 ₪,
   מדעטק at 36 ₪ …). Prices drawn from a seasonal campaign say so in
   `description_he` and need re-checking; `verified_at` is left NULL on every
   seed row, because these came off public pages rather than from inside a
   member account.
2. **Members** — the quick-add form. You are already looking at an offer in your
   club app; capturing it takes about twenty seconds, and then the whole group
   has it.

The offers layer is deliberately isolated so a licensed feed could replace or
supplement the seed later without touching the UI.

### Asking is not always free

Pais gives each subscriber a **capped monthly entitlement quota** — 12 for כסף
(3 food, 6 cinema/shows, 3 other), 18 for פלטינום — which does not carry over
month to month. So asking a friend to book you a Pais benefit spends something
scarce of theirs. Offers carry a `costs_quota` flag; where it is set the card
warns you, and the WhatsApp message says it out loud:

> (יודע שזה מנצל לך זכאות חודשית — רק אם זה מסתדר לך)

---

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind (RTL) · Supabase (Postgres +
Auth) · deployed on Vercel. Free tiers cover a group of this size.

---

## Seeing it without a backend

Every route needs Supabase, but every component takes plain props — so the UI
renders from the seed catalog with no database at all.

```bash
npm run demo    # regenerates demo/index.html from supabase/seed/*
```

`demo/build-demo.ts` imports the real `PROGRAMS` and `OFFERS` arrays, applies a
five-member demo group, and inlines the result into a standalone page. The
offers are never retyped, so the demo shows exactly what the app would.

The demo group is arranged so every state appears: מיכאל holds לאומי בונוס and
מילואים (the "יש לכם את זה" case), דנה and נועה both hold פיס פלוס (two ask
buttons on one card), יוסי holds HOT, אורי holds מילואים, and **nobody holds
American Express** — which is what turns its 8 offers into gap-analysis cards.

Tapping an ask opens a preview of the Hebrew message rather than a real
`wa.me` link: the demo members are fictional, and firing a live WhatsApp link at
a fake number would just land on "this number is not on WhatsApp".

## Setup

```bash
cd benefits
npm install
cp .env.example .env.local     # fill in your Supabase project values
```

Apply the schema — paste both files into the Supabase SQL editor in order, or
use the CLI:

```
supabase/migrations/0001_init.sql       schema, pg_trgm indexes, RLS policies
supabase/migrations/0002_functions.sql  profile bootstrap, groups, feed
```

Then seed and run:

```bash
npm run seed    # needs SUPABASE_SERVICE_ROLE_KEY
npm run dev
```

In the Supabase dashboard, enable **Google** and **Email (magic link)** under
Authentication → Providers, and add `<your-url>/auth/callback` to the redirect
allow-list.

---

## Notable design decisions

**Auth without paid SMS.** Phone OTP is the natural Israeli choice but Supabase
requires a paid SMS provider for it. Login is Google/email; the phone is
collected during onboarding as a profile field, because it is needed for
WhatsApp, not for authentication.

**Hebrew search uses trigrams, not full-text.** Postgres ships no Hebrew
dictionary — `to_tsvector('hebrew', …)` does not exist. Search runs on a
`pg_trgm` GIN index over `title_he || ' ' || merchant`, which matches Hebrew
substrings including partial words. `components/OfferFeed.tsx` mirrors those
semantics client-side while the whole feed fits in one response.

**Membership is granted only through functions.** `group_members` has no insert
policy at all. `create_group()` and `join_group_by_code()` are the only two
doors in, so an invite code never has to make a group readable to a non-member.

**Global offers cannot be written through the API.** The insert policy requires
both `group_id IS NOT NULL` and `created_by = auth.uid()`, and a CHECK constraint
enforces the pairing. Seed rows go in through the service role only.

**Phone numbers are the most sensitive data here.** A `profiles` row is readable
only by its owner and by people who share a group with them.

---

## Verification

```bash
npm test        # 16 unit tests: phone normalization, wa.me links, Hebrew messages
npm run typecheck
npm run build
npm run test:db # applies migrations to a scratch Postgres and runs the RLS suite
```

`npm run test:db` needs a local Postgres 16. `tests/sql/00_supabase_shim.sql`
stubs the Supabase-specific pieces (the `auth` schema, `auth.uid()`, the
`anon`/`authenticated` roles) so the policies can be exercised for real. The
suite asserts, among other things, that an outsider reads **zero** rows of
another group's profiles, memberships, offers and phone numbers, that
`group_offers()` refuses a non-member, and that a forged `created_by` is
rejected.

Not automated: a browser end-to-end pass needs a live Supabase project. Work
through the two-browser flow in the plan (create a group, join by invite link,
confirm each offer shows the right holder, click through to WhatsApp).

---

## What's next

Tracked request lifecycle (pending → accepted → used) with a group savings
tally · screenshot → OCR quick-add · push notifications for expiring offers ·
member verification voting · publishing a group offer globally · more programs
(Isracard, Max, Cal, retail clubs).
