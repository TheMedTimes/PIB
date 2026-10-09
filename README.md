# P.I.B. - Pharmac In a Bottle

A pharmacology study PWA for medical students, by TheMedTimes. Three sections
(MOA, ADR, DOC), each with a daily 6-pair match the following game, a timer
with a +10s penalty for wrong pairs, an optional login, a daily leaderboard
and a streak counter.

Live site: https://themedtimes.github.io/PIB/

## How it works

- **Daily set**: computed in the browser from the date, no server involved.
  Every visitor sees the same 6 pairs per section. The set (and the weekly
  reshuffle) changes at **midnight IST** for everyone, whatever their device
  timezone. One shuffle per ISO week is sliced into daily chunks, so nothing
  repeats within a week (verified over 400 simulated days). See
  `src/utils/dailyRotation.js`.
- **Login is optional.** Guests play freely and nothing is stored. Logged-in
  players get one saved attempt per section per day, a place on the
  leaderboard (needs all three sections), and a streak.
- **Leaderboard**: top 10 by lowest cumulative time across MOA + ADR + DOC for
  the current IST day. Old rows are removed so no daily result data is kept.
- **Streak**: a separate tiny table (`streaks`) holding only a count and the
  last completed day, so streaks work without keeping history.

## Tech

React + Vite, plain CSS, `react-router-dom`, `@supabase/supabase-js`,
`vite-plugin-pwa`, `lucide-react`. Fonts are bundled (`@fontsource`), no
third-party requests. Hosted on GitHub Pages, backend on Supabase (free tiers).

## Question data

`src/data/moa.json`, `adr.json`, `doc.json`. Each is an array of
`{ "id", "left", "right", "chapter" }`. `left` is the question card, `right`
the answer card; `chapter` is metadata for a future per-system mode and is not
shown. Rules: ids unique; no two entries with the same `left` and different
`right`; keep cards short (answers under about 65 characters, questions under
about 60) so they fit a phone screen. Several questions may share one answer
(common in DOC); the game accepts any identical-looking answer card.
Keep at least 42 entries per section (7 days x 6) for a full week with no
repeats.

After editing data, push to `main`; the site rebuilds and deploys itself.

## Supabase setup (order matters)

Run in the Supabase SQL Editor:

1. `supabase/schema.sql`: **first-time setup only. It DROPS and recreates the
   tables, wiping any data.** Never run it on a live project.
2. `supabase/add_streaks.sql`
3. `supabase/switch_to_ist.sql`
4. `supabase/launch_hardening.sql`

Dashboard settings to check (Authentication):

- URL Configuration: Site URL = `https://themedtimes.github.io/PIB/` and add it
  to Redirect URLs. Otherwise confirmation and reset emails link to the wrong place.
- Providers > Email: decide on "Confirm email". Supabase's built-in email
  sender only delivers to your own team's addresses and is heavily rate
  limited, so for a public site either turn confirmation off or configure
  custom SMTP (also required for password-reset emails to reach players).

## Running locally

```bash
npm install
npm run dev
```

## Deploying

Automatic: every push to `main` runs `.github/workflows/deploy.yml` and
publishes to GitHub Pages (Settings > Pages > Source: GitHub Actions). If the
repo is renamed or moved to a custom domain, update `BASE_PATH` in
`vite.config.js`.

The installed app checks for a new version on launch, on returning to the
foreground and hourly, and reloads itself when one is found.

## Operations

- **Delete a user** (they email to ask): Supabase > Authentication > Users >
  delete. Their profile, results and streak are removed with it.
- **Remove an offensive nickname**: Table Editor > `profiles`, edit the row.
- **Free tier note**: Supabase pauses free projects after about a week with no
  activity. Anyone using the app counts as activity, but if traffic ever stops,
  restore the project from the dashboard.
