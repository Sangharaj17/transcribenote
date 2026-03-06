# Supabase Setup for TranscribeNote

The backend uses **Supabase's API** (project URL + service role key), not a raw PostgreSQL connection string.

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **New Project**
3. Choose organization, name the project (e.g. `transcribenote`), set a database password, pick a region
4. Wait for the project to be created

## 2. Get your API credentials

1. In the Supabase Dashboard, go to **Project Settings** (gear icon) → **API**
2. Copy **Project URL** (e.g. `https://xxxxx.supabase.co`)
3. Go to **Project Settings** → **API** (or **API Keys**)
4. Under **Project API keys**, find **service_role secret**
5. Click **Reveal** and copy the key (starts with `eyJ...`)

**Important:** The service_role key bypasses Row Level Security. Never expose it in the frontend or in public repos.

## 3. Add to backend .env

Add these to `backend/.env`:

```
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Use your actual Project URL and service_role key from step 2.

## 4. Create tables in Supabase

1. In Supabase Dashboard, go to **SQL Editor**
2. Click **New query**
3. Copy the contents of `scripts/init_db.sql` and paste it
4. Click **Run** (or press Ctrl+Enter)

The `users` and `transcripts` tables will be created.

**If you previously had a wrong schema:** Run `scripts/fix_transcripts_schema.sql` in the SQL Editor instead of (or after) `init_db.sql`.

## 5. Restart your backend

```bash
cd backend
node server.js
```

Your app will now use Supabase's database API.
