import { createClient } from "@supabase/supabase-js";

const json = (res, status, body) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
};

const env = (...names) => names.map((name) => process.env[name]).find(Boolean);

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return json(res, 200, { ok: true });
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed." });

  try {
    const supabaseUrl = env("SUPABASE_URL", "VITE_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
    const serviceRoleKey = env(
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_SECRET_KEY",
      "SUPABASE_SERVICE_KEY",
      "SUPABASE_SERVICE_ROLE",
    );
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error(
        "Missing server Supabase environment variables. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel, then redeploy.",
      );
    }

    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) throw new Error("Missing admin session.");

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: authUser, error: authError } = await adminClient.auth.getUser(token);
    if (authError || !authUser.user) throw new Error("Invalid admin session.");

    const { data: caller, error: callerError } = await adminClient
      .from("profiles")
      .select("id, access_role, active")
      .eq("auth_user_id", authUser.user.id)
      .single();
    if (callerError || caller?.access_role !== "Admin" || !caller.active) {
      throw new Error("Only active admins can update passwords.");
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    if (!body.accountId || !body.password) {
      throw new Error("Account and password are required.");
    }

    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("id, auth_user_id")
      .eq("id", body.accountId)
      .single();
    if (profileError || !profile?.auth_user_id) throw new Error("Account is not linked to a Supabase Auth user.");

    const { error: updateError } = await adminClient.auth.admin.updateUserById(profile.auth_user_id, {
      password: body.password,
    });
    if (updateError) throw updateError;

    const { error: credentialError } = await adminClient.from("account_credentials").upsert({
      profile_id: body.accountId,
      password: body.password,
      updated_at: new Date().toISOString(),
    });
    if (credentialError) throw credentialError;

    return json(res, 200, { ok: true });
  } catch (error) {
    return json(res, 400, { error: error instanceof Error ? error.message : "Unknown error." });
  }
}
