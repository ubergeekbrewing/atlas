# ATLAS

Personal **diet and fitness** tracker: daily calories and macros vs your targets, workout log with a weekly session count, and JSON backup (data stays in the browser via `localStorage`).

The UI is **mobile-first**: thumb-friendly bottom navigation on small screens, safe-area padding for notched devices, `100dvh` layout, 16px+ form fields (avoids iOS zoom on focus), and a [web app manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest) so you can add the site to your home screen.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Push to GitHub

1. Create a new empty repository on [GitHub](https://github.com/new) (no README/license if this folder already has them).
2. In this project directory:

```bash
git add -A
git commit -m "Initial ATLAS tracker"
git branch -M main
git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
git push -u origin main
```

Replace `YOUR_USER/YOUR_REPO` with your repository path.

## Deploy on Vercel

1. Sign in at [vercel.com](https://vercel.com) and choose **Add New… → Project**.
2. **Import** your GitHub repository.
3. Framework preset **Next.js**; leave defaults (build: `next build`, output: `.next`).
4. Click **Deploy**. Your app will be live at `https://<project>.vercel.app`.

Because this app stores data only in the visitor’s browser, each device keeps its own log unless you use **You → Export / Import JSON** to move a backup.

## Supabase (optional next step)

For **automatic sync** across phone and desktop (instead of manual JSON export), you would add [Supabase](https://supabase.com): Auth (e.g. magic link), tables for `profiles`, `meals`, and `workouts`, and Row Level Security so each user only reads their own rows. The current app stays usable without Supabase; treat cloud sync as a follow-on feature when you are ready to manage env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) on Vercel.
