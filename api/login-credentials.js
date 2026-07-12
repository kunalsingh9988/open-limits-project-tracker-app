import { createClient } from "@supabase/supabase-js";

const json = (res, status, body) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
};

const env = (...names) => names.map((name) => process.env[name]).find(Boolean);

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return json(res, 200, { ok: true });
  if (req.method !== "GET") return json(res, 405, { error: "Method not allowed." });

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

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: profiles, error: profilesError } = await adminClient
      .from("profiles")
      .select("id, display_name, username, access_role, active")
      .eq("active", true)
      .order("access_role")
      .order("display_name");
    if (profilesError) throw profilesError;

    const { data: credentials, error: credentialsError } = await adminClient
      .from("account_credentials")
      .select("profile_id, password, updated_at");
    if (credentialsError) throw credentialsError;

    const passwordByProfile = new Map((credentials || []).map((credential) => [credential.profile_id, credential.password]));
    const updatedByProfile = new Map((credentials || []).map((credential) => [credential.profile_id, credential.updated_at]));

    return json(res, 200, {
      credentials: (profiles || []).map((profile) => ({
        id: profile.id,
        name: profile.display_name,
        username: profile.username,
        accessRole: profile.access_role,
        password: passwordByProfile.get(profile.id) || (profile.username === "admin" ? "admin123" : ""),
        updatedAt: updatedByProfile.get(profile.id) || null,
      })),
    });
  } catch (error) {
    return json(res, 400, { error: error instanceof Error ? error.message : "Unknown error." });
  }
}
