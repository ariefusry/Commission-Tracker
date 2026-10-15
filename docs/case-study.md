# Case study: Commission Tracker

## The problem

Illustrators who sell commissions juggle many small orders at once. A typical artist keeps a list in a spreadsheet or chat history: who ordered what, the agreed price, whether the deposit came in, and the deadline. Clients keep asking the same questions: "Has my turn come yet?" and "When will it be done?"

Two things go wrong. The artist loses track of money: deposits from cancelled orders, unpaid balances on finished work. And answering progress questions one by one eats into drawing time.

## Who it is for

Solo artists, many of them in Indonesia, who draw anime and VTuber-style commissions and take orders through Twitter/X and Discord. They work from a laptop and check status on their phone, so every screen has to work at 390px wide.

## What I built

- A commission list and a board ordered by who booked first, with drag and drop to change priority.
- Pricing from order types and add-ons, with a manual override.
- Payment tracking and a dashboard for income, unpaid balances, and late work.
- A private tracking link per commission. The client sees the current stage, their place in the waiting list, and an estimated finish date. They never see prices or other clients' names.
- Indonesian and English, light and dark themes.

## Key decisions

**The database enforces privacy.** Every table uses row-level security keyed to the logged-in user. The public tracking page does not query tables at all. It calls one Postgres function, `get_tracking(code)`, which returns a fixed set of progress fields for one commission. The anonymous role has no table grants, so a bug in the page cannot leak another artist's data. SQL tests in `supabase/tests/` check these rules inside a rolled-back transaction.

**Prices are snapshots.** Artists change their price list over time. When an artist saves a commission, the app stores the base price and each add-on price on that commission. Editing an old commission keeps the price the client agreed to, even if the price list has changed since. All price math lives in `lib/pricing.ts` and has unit tests. Money is integer rupiah, so the totals never carry rounding errors.

**First come, first served, with a manual override.** The waiting list starts in booking order, because that is what clients expect. A fractional `queue_order` column lets the artist drag a card between two others with a single row update. The client tracking page reads the same order, so the queue the artist sees and the queue the client sees always match.

**Estimates that admit they are estimates.** The finish date comes from the artist's real pace: how many commissions they finished in the last 90 days. With fewer than three finished commissions the page shows no estimate at all. When it does show one, it gives a ±25% range and says so in plain words.

**Two languages without breaking links.** Artists had already sent clients tracking links like `/track/3d8e7808`, so adding `/en/...` prefixes would have broken them. Instead, every route lives under `app/[lang]`, and the request proxy rewrites `/track/3d8e7808` to `/en/track/...` or `/id/track/...` based on a `lang` cookie. The URL in the browser never changes. Both language versions still prerender, which matters because the app uses Next.js Cache Components. The dictionaries are typed: if the English file misses a key, the build fails.

**Free, funded by donations.** The first plan had a paid subscription with a trial. I dropped it. Artists in this market already pay platform fees, and a tracker only helps if they use it for every order. The app is free with a QRIS donation page, and the subscription table stays unused.

**Storage that cleans itself up.** WIP images give clients something to look at, but they fill free-tier storage fast. The browser compresses each image to WebP at 1600px before upload, the app caps it at 10 per commission, and a daily Vercel Cron job deletes images 30 days after a commission is done. Every delete checks how many files Storage actually removed, because Supabase's `remove()` does not report an error when a policy blocks it.

**Charts checked by a script.** The dashboard colors carry meaning: green for paid, amber for unpaid, and a blue ramp for the work pipeline. I checked each palette with a validator for lightness, color-blind separation, and contrast in both themes. That check failed the first amber, which had a 1.83:1 contrast on white. Every chart also has a table view.

## Results

- Shipped and live at https://commission-tracker-one.vercel.app, deployed from `main` on every push.
- 50 unit tests covering pricing, dashboard stats, the queue estimate, dates, and formatting. 5 SQL test suites covering RLS, saving, tracking, the queue, and WIP images.
- A responsive audit of 18 pages at 4 widths (390, 768, 1024, 1280 px) found no horizontal overflow.
- Full Indonesian and English UI, including validation messages and server errors.

## What I would do next

- A public order form, so clients can book a slot and the artist can open or close commissions with one switch.
- CSV or PDF export for invoices.
- Deadline reminders by email or Discord webhook.
