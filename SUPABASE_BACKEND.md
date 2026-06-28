# Supabase Backend Setup

## 1. Apply the database schema

Open Supabase Dashboard → SQL Editor and run:

```sql
-- paste the contents of supabase/schema.sql
```

The schema creates real Postgres tables, explicit grants, and Row Level Security policies.

## 2. Configure environment variables

Set these in Vercel and in local `.env.local`:

```bash
VITE_SUPABASE_URL=https://ltyqshfaiodglkvcebkw.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable-or-anon-key>
```

Never put the service role key or secret key in frontend code.

## 3. Create Supabase Auth users

Create email/password users in Supabase Auth. Then connect each user to an app profile by setting
`profiles.auth_user_id` to that user's `auth.users.id`.

Current profile IDs can stay as existing app IDs such as `acct-admin`, `acct-kunal`, and `acct-harsh`.

## 4. Sync current app data

After the schema and environment variables are configured:

1. Log in as Admin.
2. Go to Settings.
3. Click `Sync to Supabase`.

This uploads current local app data into Supabase tables.

## 5. Security note

If service role or secret keys were shared in chat or screenshots, rotate them in Supabase Dashboard before production use.
