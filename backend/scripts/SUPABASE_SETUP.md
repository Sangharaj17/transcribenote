# Supabase Setup for TranscribeNote

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **New Project**
3. Choose organization, name the project (e.g. `transcribenote`), set a database password, pick a region
4. Wait for the project to be created

## 2. Get your connection string

1. In the Supabase Dashboard, go to **Project Settings** (gear icon) → **Database**
2. Under **Connection string**, select **URI**
3. Copy the connection string (it looks like `postgresql://postgres.[ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres`)
4. Replace `[YOUR-PASSWORD]` with your actual database password

## 3. Add to backend .env

Add this line to `backend/.env`:

```
DATABASE_URL=postgresql://postgres.xxxxx:YOUR_PASSWORD@aws-0-xx.pooler.supabase.com:6543/postgres
```

(Use your actual connection string from step 2.)

## 4. Create tables in Supabase

1. In Supabase Dashboard, go to **SQL Editor**
2. Click **New query**
3. Copy the contents of `init_db.sql` and paste it
4. Click **Run** (or press Ctrl+Enter)

The `users` and `transcripts` tables will be created.

**If you previously had a wrong schema:** Run `fix_transcripts_schema.sql` in the SQL Editor instead of (or after) `init_db.sql`.

## 5. Restart your backend

```bash
cd backend
node server.js
```

Your app will now use Supabase for the database.
