# WC Predictor 2026 — Setup Guide

Follow these steps in order after cloning the repo.

---

## 1. Supabase — Create project & run schema

1. Go to [supabase.com](https://supabase.com) → New project
2. Copy your **Project URL** and **anon key** from Project Settings → API
3. Also copy the **service_role key** (keep it secret — server-side only)
4. Go to **SQL Editor** → New query → paste the contents of `supabase/schema.sql` → Run
5. Go to **Authentication → Email** → enable **Magic links** (disable email confirmation if you want instant login)
6. Set the **Site URL** to your Vercel domain (or `http://localhost:3000` for dev)
7. Add `http://localhost:3000/auth/callback` to **Redirect URLs**

---

## 2. RapidAPI — Get api-football.com key

1. Go to [rapidapi.com](https://rapidapi.com/api-sports/api/api-football)
2. Subscribe to **API-Football** (free tier: 100 requests/day)
3. Copy your **X-RapidAPI-Key** from the API dashboard

---

## 3. Environment variables

Copy `.env.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=         # from Supabase project settings
NEXT_PUBLIC_SUPABASE_ANON_KEY=    # from Supabase project settings
SUPABASE_SERVICE_ROLE_KEY=        # from Supabase project settings (secret!)

RAPIDAPI_KEY=                     # your RapidAPI key
RAPIDAPI_HOST=api-football-v1.p.rapidapi.com

ADMIN_EMAIL=nkrishnanthampi@gmail.com   # your email — auto-grants admin on first login

NEXT_PUBLIC_APP_URL=http://localhost:3000  # update to your Vercel URL after deploy
```

---

## 4. Grant yourself admin access

After you first sign in via magic link, run this in Supabase SQL Editor:

```sql
update public.profiles
set is_admin = true
where email = 'nkrishnanthampi@gmail.com';
```

---

## 5. Run locally

```
npm run dev
```

Visit http://localhost:3000 — sign in with your email, then go to `/admin` to sync fixtures.

---

## 6. Deploy to Vercel

1. Push code to GitHub (see main README)
2. Go to [vercel.com](https://vercel.com) → New Project → import `wc-predictor`
3. Add all environment variables from `.env.local` in the Vercel dashboard
4. Change `NEXT_PUBLIC_APP_URL` to your Vercel URL (e.g. `https://wc-predictor.vercel.app`)
5. Deploy

After deploying:
- Update Supabase **Site URL** to your Vercel domain
- Add `https://your-domain.vercel.app/auth/callback` to Supabase **Redirect URLs**

---

## 7. Sync fixtures from api-football.com

1. Log in as admin → go to `/admin`
2. Click **Sync fixtures from API** — this imports all 2026 WC fixtures
3. After each match day, click **Sync results & score predictions**

> Note: The 2026 World Cup API data may not be available until closer to the tournament
> (June 2026). Until then, you can manually add test matches via Supabase SQL Editor.

---

## Scoring reference

| Stage | Correct winner | Exact scoreline |
|---|---|---|
| Group stage | 1 pt | 2 pts |
| Round of 32 | 2 pts | 4 pts |
| Round of 16 | 3 pts | 6 pts |
| Quarter-final | 4 pts | 8 pts |
| Semi-final | 5 pts | 10 pts |
| Final | 6 pts | 12 pts |
| Tournament winner prediction | — | 10 pts bonus |
