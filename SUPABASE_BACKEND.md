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
SUPABASE_SERVICE_ROLE_KEY=<your service role key>
```

Apply to Production, Preview, and Development, then redeploy.

Only the `VITE_` values are sent to the browser. `SUPABASE_SERVICE_ROLE_KEY` is used by the Vercel server endpoint that lets admins create employee accounts.

## 4. Create the first admin

Open the deployed app.

On the login screen:

1. Choose `Admin`.
2. Enter username `admin`.
3. Enter password `admin123`.
4. Click `Create first admin`.

The app creates a Supabase Auth user using `admin@openlimits.local` and inserts the first admin profile.

After that, log in with:

```txt
ID: admin
Password: admin123
```

## 5. User creation backend

Admin creates employee IDs/passwords from the app through `/api/create-user`, a Vercel server endpoint. This needs `SUPABASE_SERVICE_ROLE_KEY` in Vercel.

The older Supabase Edge Function in this repository is no longer required by the app. The Vercel endpoint is the active user-creation path.

Do not prefix the service role key with `VITE_`. It must stay server-only.

## 6. Employee accounts

Admin can create employee IDs and passwords inside `Team & Roles`.

Example:

```txt
Name: Kunal Singh
Username: kunal
Password: kunal123
```

The app creates:

- a Supabase Auth user: `kunal@openlimits.local`
- a profile row in `profiles`

The employee logs in with:

```txt
ID: kunal
Password: kunal123
```

## Security

Never put service role or secret keys in frontend/Vercel public env vars. Rotate any service/secret keys that were shared outside the Supabase dashboard.
