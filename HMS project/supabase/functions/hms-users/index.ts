import { createClient } from "npm:@supabase/supabase-js@2.117.2";
const respond = (
  body: Record<string, unknown>,
  status: number,
  headers: Record<string, string>,
) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
function injectedKey(mapName: string, legacyName: string): string | undefined {
  const raw = Deno.env.get(mapName);
  if (raw) {
    try {
      const map: Record<string, unknown> = JSON.parse(raw);
      if (typeof map.default === "string") return map.default;
    } catch {
      /* Legacy projects expose the individual key instead. */
    }
  }
  return Deno.env.get(legacyName);
}
Deno.serve(async (request) => {
  const url = Deno.env.get("SUPABASE_URL"),
    publicKey = injectedKey("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY"),
    secret = injectedKey("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY"),
    appUrl = Deno.env.get("APP_URL");
  let appOrigin = "";
  try {
    appOrigin = appUrl ? new URL(appUrl).origin : "";
  } catch {
    return new Response(
      JSON.stringify({ error: "Account service URL is invalid." }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }
  const origin = request.headers.get("Origin") || "";
  const allowed = (Deno.env.get("CORS_ALLOWED_ORIGINS") || appOrigin)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const headers = {
    "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : "",
    "Access-Control-Allow-Headers":
      "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
  if (origin && !allowed.includes(origin))
    return respond(
      { error: "This site is not allowed to use the account service." },
      403,
      headers,
    );
  if (request.method === "OPTIONS")
    return new Response(null, { status: 204, headers });
  if (request.method !== "POST")
    return respond({ error: "POST required." }, 405, headers);
  if (!url || !publicKey || !secret || !appUrl)
    return respond(
      { error: "Account service setup is incomplete." },
      503,
      headers,
    );
  const token = request.headers
    .get("Authorization")
    ?.replace(/^Bearer\s+/i, "");
  if (!token)
    return respond(
      { error: "Sign in before managing accounts." },
      401,
      headers,
    );
  const actor = createClient(url, publicKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const verified = await actor.auth.getUser(token);
  if (verified.error || !verified.data.user)
    return respond(
      { error: "Your session expired. Sign in again." },
      401,
      headers,
    );
  const access = await actor.rpc("hms_get_access");
  if (access.error || access.data?.role !== "admin")
    return respond({ error: "Administrator access required." }, 403, headers);
  const service = createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  try {
    const body = await request.json();
    const redirect = new URL(appUrl);
    redirect.searchParams.set(
      "auth",
      body.action === "invite" ? "invite" : "reset",
    );
    if (body.action === "reset") {
      if (typeof body.userId !== "string")
        return respond({ error: "Choose an account." }, 400, headers);
      const list = await actor.rpc("hms_list_users");
      const account = list.data?.find(
        (item: { userId: string; role: string }) =>
          item.userId === body.userId && item.role !== "unassigned",
      );
      if (list.error || !account)
        return respond({ error: "Hospital account not found." }, 400, headers);
      const sent = await service.auth.resetPasswordForEmail(account.email, {
        redirectTo: redirect.href,
      });
      if (sent.error)
        return respond(
          {
            error:
              "Reset email could not be sent. Check email delivery settings.",
          },
          400,
          headers,
        );
      await actor.rpc("hms_log_account_action", {
        target_user: body.userId,
        account_action: "password_reset_sent",
      });
      return respond({ ok: true }, 200, headers);
    }
    if (
      !["invite", "create"].includes(body.action) ||
      typeof body.email !== "string" ||
      body.email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email) ||
      typeof body.name !== "string" ||
      !body.name.trim() ||
      body.name.length > 100 ||
      !body.membership
    )
      return respond(
        { error: "Enter the account email, name and role assignment." },
        400,
        headers,
      );
    if (
      body.action === "create" &&
      (typeof body.password !== "string" ||
        body.password.length < 12 ||
        body.password.length > 128)
    )
      return respond(
        { error: "Use an initial password of 12 to 128 characters." },
        400,
        headers,
      );
    // Only the server holds the Auth administration key. Role comes from SQL membership.
    const created =
      body.action === "invite"
        ? await service.auth.admin.inviteUserByEmail(body.email.trim(), {
            data: { full_name: body.name.trim() },
            redirectTo: redirect.href,
          })
        : await service.auth.admin.createUser({
            email: body.email.trim(),
            password: body.password,
            email_confirm: true,
            user_metadata: { full_name: body.name.trim() },
          });
    if (created.error || !created.data.user)
      return respond(
        {
          error:
            "Account could not be created. If the email already exists, edit its access under Login accounts.",
        },
        400,
        headers,
      );
    const linked = await actor.rpc("hms_set_membership", {
      target_user: created.data.user.id,
      role_name: body.membership.role_name,
      department_name: body.membership.department_name,
      staff_record: body.membership.staff_record,
      doctor_record: body.membership.doctor_record,
      assigned_wards: body.membership.assigned_wards,
      is_active: body.membership.is_active,
    });
    if (linked.error)
      return respond(
        {
          error:
            "The login account was created, but its access was not assigned. Refresh Login accounts, then edit the account and choose valid staff, department and ward links.",
        },
        409,
        headers,
      );
    await actor.rpc("hms_log_account_action", {
      target_user: created.data.user.id,
      account_action:
        body.action === "invite" ? "invitation_sent" : "account_created",
    });
    return respond({ ok: true, userId: created.data.user.id }, 200, headers);
  } catch {
    return respond(
      {
        error:
          "Account request could not be completed. Check the service setup and try again.",
      },
      400,
      headers,
    );
  }
});
