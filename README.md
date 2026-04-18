# ATLAS

Personal **diet and fitness** tracker: daily calories and macros vs your targets, workout log with a weekly session count, and JSON backup (data stays in the browser via `localStorage`).

The UI is **mobile-first**: thumb-friendly bottom navigation on small screens, safe-area padding for notched devices, `100dvh` layout, 16px+ form fields (avoids iOS zoom on focus), and a [web app manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest) so you can add the site to your home screen.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Live on Vercel

Production: **https://atlas-five-pi.vercel.app**

Redeploy from this machine after changes:

```bash
vercel deploy --prod --yes
```

Because this app stores data only in the visitor’s browser, each device keeps its own log unless you use **You → Export / Import JSON** to move a backup.

## GitHub (connect for deploy-on-push)

The default branch is **`main`**. Create an **empty** repo on [GitHub](https://github.com/new) (skip README, license, and `.gitignore` if GitHub offers them—you already have those here), then:

```bash
git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
git push -u origin main
```

Replace `YOUR_USER/YOUR_REPO` with your GitHub username and repository name.

**Link Vercel to GitHub** so every push rebuilds the site:

1. Open [Vercel project settings → Git](https://vercel.com/rob-4757s-projects/atlas/settings/git) for this project, click **Connect Git Repository**, and choose the repo you just pushed; or  
2. From this directory after the repo exists: `vercel git connect https://github.com/YOUR_USER/YOUR_REPO.git`

## Supabase (optional next step)

For **automatic sync** across phone and desktop (instead of manual JSON export), you would add [Supabase](https://supabase.com): Auth (e.g. magic link), tables for `profiles`, `meals`, and `workouts`, and Row Level Security so each user only reads their own rows. The current app stays usable without Supabase; treat cloud sync as a follow-on feature when you are ready to manage env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) on Vercel.
