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
      throw new Error("Missing server Supabase environment variables.");
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
    if (authUser.user.email?.toLowerCase() !== "admin@openlimits.local") {
      throw new Error("Only the primary admin account can repair the admin profile.");
    }

    const profile = {
      id: "acct-admin",
      auth_user_id: authUser.user.id,
      display_name: "Open Limits Admin",
      username: "admin",
      access_role: "Admin",
      job_role_id: null,
      role: "Operations Lead",
      color_tag: "#5B5FEF",
      active: true,
      created_at: new Date().toISOString(),
    };

    await adminClient.from("profiles").delete().eq("username", "admin").neq("id", "acct-admin");
    const { error: profileError } = await adminClient.from("profiles").upsert(profile);
    if (profileError) throw profileError;

    return json(res, 200, { profile });
  } catch (error) {
    return json(res, 400, { error: error instanceof Error ? error.message : "Unknown error." });
  }
}
