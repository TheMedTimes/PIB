# P.I.B. - Pharmac In a Bottle

A pharmacology study PWA for medical students, by TheMedTimes. Three sections
(MOA, ADR, Therapy), each showing a daily 6-pair match the following game
that automatically rotates, with no repeats within a calendar week.

## How the daily rotation works

There is no backend and no accounts. Every visitor sees the same 6 pairs on
the same calendar day because the set is computed deterministically from
today's date (`src/utils/dailyRotation.js`):

1. The full list for a section (e.g. all MOA entries) is shuffled once per
   ISO week, using the week number as the shuffle seed.
2. That shuffled list is sliced into chunks of 6, one chunk per day.
3. Since it's one shuffle sliced into non-overlapping pieces, nothing repeats
   within that week, as long as the list has at least 42 entries (7 days x 6).
   Below that, the tool will start repeating within the week and shows a
   small on-screen note reminding you the list needs to grow.

Nothing needs to run on a schedule. No cron job, no database.

## Updating the drug data

Replace the contents of:
- `src/data/moa.json`
- `src/data/adr.json`
- `src/data/therapy.json`

Each is a flat array of `{ "id": "unique-id", "left": "...", "right": "..." }`
objects. `left`/`right` are just the two columns of the match game (drug name
vs. mechanism, drug vs. reaction, condition vs. therapy). Keep `id` unique
within each file. Commit and push, the GitHub Actions workflow rebuilds and
redeploys automatically.

If you're converting from Excel, export each sheet to CSV then run it through
any CSV-to-JSON converter (or ask Claude to do it) matching that shape.

## Local development

```bash
npm install
npm run dev
```

## Deploying

Deployment is automatic via GitHub Actions (`.github/workflows/deploy.yml`):
every push to `main` builds the site and publishes it to GitHub Pages.

One-time setup on GitHub:
1. Push this repo to `main`.
2. In the repo, go to Settings > Pages.
3. Under "Build and deployment", set Source to "GitHub Actions".
4. Push again (or re-run the workflow from the Actions tab) and the site
   will be live at `https://themedtimes.github.io/PIB/`.

If you ever rename the repo or move to a custom domain, update `BASE_PATH`
in `vite.config.js` to match (use `/` for a root domain or a user/org page).

## Icons

`public/icons/` holds the generated PWA icon set from the bottle artwork.
Regenerate them any time by dropping a new square source image and re-running
the resize step (ask Claude, or use any image tool) at 192x192, 512x512, and
maskable versions with roughly 10% padding.
