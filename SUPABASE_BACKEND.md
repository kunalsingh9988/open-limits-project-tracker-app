# Supabase Backend Setup

The app now uses Supabase as the only data source. Local JSON import/export/reset and manual sync are removed.

## 1. Apply or update the schema

Supabase Dashboard -> SQL Editor -> New query.

Paste and run the full contents of:

```txt
supabase/schema.sql
```

## 2. Clear old app data

If you want the app to start completely empty, run this after the schema:

```txt
supabase/empty_database.sql
```

This removes app tables only. It does not delete Supabase Auth users.

## 3. Vercel environment variables

Vercel Project -> Settings -> Environment Variables.

Add:

```bash
VITE_SUPABASE_URL=https://ltyqshfaiodglkvcebkw.supabase.co
VITE_SUPABASE_ANON_KEY=<your publishable or anon key>
```

Apply to Production, Preview, and Development, then redeploy.

## 4. Create the first admin

Open the deployed app.

On the login screen:

1. Choose `Admin`.
2. Enter username `admin`.
3. Enter a password.
4. Click `Create first admin`.

The app creates a Supabase Auth user using `admin@openlimits.local` and inserts the first admin profile.

After that, log in with username `admin` and the same password.

## 5. Employee accounts

Admin can create employee profiles inside `Team & Roles`.

For each employee, create a matching Supabase Auth user with email:

```txt
username@openlimits.local
```

Then set that user's UUID into `profiles.auth_user_id`.

## Security

Never put service role or secret keys in frontend/Vercel public env vars. Rotate any service/secret keys that were shared outside the Supabase dashboard.
