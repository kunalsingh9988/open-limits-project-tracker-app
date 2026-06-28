import { createClient } from "@supabase/supabase-js";

const json = (res, status, body) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
};

const authEmail = (username) => {
  const clean = String(username || "").trim().toLowerCase();
  return clean.includes("@") ? clean : `${clean}@openlimits.local`;
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
      throw new Error("Only active admins can create users.");
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    if (!body.name || !body.username || !body.password) {
      throw new Error("Name, username, and password are required.");
    }

    const username = String(body.username).trim().toLowerCase();
    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email: authEmail(username),
      password: body.password,
      email_confirm: true,
      user_metadata: {
        username,
        display_name: body.name,
      },
    });
    if (createError) throw createError;

    const profile = {
      id: body.id,
      auth_user_id: created.user.id,
      display_name: String(body.name).trim(),
      username,
      access_role: body.accessRole || "Employee",
      job_role_id: body.jobRoleId || null,
      role: body.role || "Team Member",
      color_tag: body.colorTag || "#5B5FEF",
      active: body.active ?? true,
      created_at: new Date().toISOString(),
    };

    const { error: profileError } = await adminClient.from("profiles").upsert(profile);
    if (profileError) throw profileError;

    return json(res, 200, { profile });
  } catch (error) {
    return json(res, 400, { error: error instanceof Error ? error.message : "Unknown error." });
  }
}
