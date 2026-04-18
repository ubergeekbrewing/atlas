# ATLAS

Personal **diet and fitness** tracker: daily calories and macros vs your targets, workout log with a weekly session count, and optional **JSON export** for your own backups.

**Supabase is required.** The app starts an **anonymous Supabase session** automatically (no email or password) when env vars are set. Meals, workouts, labs, and targets live only in your Supabase project (Row Level Security tied to `auth.uid()`). There is no `localStorage` cache of the log.

**Without Supabase env vars**, the app shows a short setup screen instead of the tracker.

The UI is **mobile-first**: thumb-friendly bottom navigation on small screens, safe-area padding for notched devices, `100dvh` layout, 16px+ form fields (avoids iOS zoom on focus), and a [web app manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest) so you can add the site to your home screen.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Supabase setup (cloud sync)

1. Create a project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, run these migrations in order (creates tables, RLS, and the new-user profile trigger):
   - `supabase/migrations/20260418120000_init_tracker.sql` — `profiles`, `meals`, `workouts`
   - `supabase/migrations/20260420200000_lab_abnormals.sql` — `lab_abnormals` (manual lab flags / values per draw)
3. **Authentication → URL configuration**  
   - **Site URL**: `http://localhost:3000` for local dev; your production URL (e.g. `https://atlas-five-pi.vercel.app`) for prod.  
   - **Redirect URLs**: add both  
     `http://localhost:3000/auth/callback`  
     `https://YOUR_DOMAIN/auth/callback`
4. **Authentication → Providers**: enable **Anonymous** (required for automatic cloud sync). Email or other providers are optional.
5. Copy **Project URL** and **anon public** key from **Project Settings → API**.
6. Create `.env.local` from `.env.example` and set:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

7. Add the same variables in **Vercel → Project → Settings → Environment Variables**, then redeploy.

Use **You → Backup** to download JSON or restore from a file; imports replace the signed-in user’s rows in Supabase.

## Live on Vercel

Production: **https://atlas-five-pi.vercel.app**

Redeploy from this machine after changes:

```bash
vercel deploy --prod --yes
```

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
