# Atlas

Personal **diet and fitness** tracker: daily calories and macros vs your targets, workout log with a weekly session count, and JSON backup (data stays in the browser via `localStorage`).

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
git commit -m "Initial Atlas tracker"
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
