import { createClient } from "https://esm.sh/@supabase/supabase-js@2.108.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Payload = {
  id?: string;
  name: string;
  username: string;
  password: string;
  accessRole: "Admin" | "Employee";
  jobRoleId?: string;
  role?: string;
  colorTag?: string;
  active?: boolean;
};

const authEmail = (username: string) => `${username.trim().toLowerCase()}@openlimits.local`;
const profileId = (username: string) =>
  `acct-${username.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing Supabase function environment variables.");
    }

    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) throw new Error("Missing authorization token.");

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: authUser, error: authError } = await adminClient.auth.getUser(token);
    if (authError || !authUser.user) throw new Error("Invalid authorization token.");

    const { data: caller, error: callerError } = await adminClient
      .from("profiles")
      .select("id, access_role, active")
      .eq("auth_user_id", authUser.user.id)
      .single();
    if (callerError || caller?.access_role !== "Admin" || !caller.active) {
      throw new Error("Only active admins can create users.");
    }

    const body = (await req.json()) as Payload;
    if (!body.name || !body.username || !body.password) {
      throw new Error("Name, username, and password are required.");
    }

    const email = authEmail(body.username);
    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password: body.password,
      email_confirm: true,
      user_metadata: {
        username: body.username,
        display_name: body.name,
      },
    });
    if (createError) throw createError;

    const profile = {
      id: body.id || profileId(body.username),
      auth_user_id: created.user.id,
      display_name: body.name,
      username: body.username.trim().toLowerCase(),
      access_role: body.accessRole,
      job_role_id: body.jobRoleId || null,
      role: body.role || "Team Member",
      color_tag: body.colorTag || "#5B5FEF",
      active: body.active ?? true,
      created_at: new Date().toISOString(),
    };

    const { error: profileError } = await adminClient.from("profiles").upsert(profile);
    if (profileError) throw profileError;

    return new Response(JSON.stringify({ profile }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
