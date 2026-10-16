import { createServerFn } from "@tanstack/react-start";

// Fixed identity for the PIN-based Admin (no email account). Owns the Admin's own played history.
const ADMIN_PLAYER_ID = "00000000-0000-0000-0000-00000000ad01";

async function expectedToken() {
  // Login must remain available even when Supabase's server-only key is not configured.
  // The admin PIN itself is already server-side, so derive the session token from it.
  const pin = process.env["ADMIN_SECRET_PIN"] ?? "1234";
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`habwa-admin:${pin}`));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function makeAdminToken() {
  return expectedToken();
}

async function assertAdmin(token: string) {
  if (!token || token !== (await expectedToken())) throw new Error("Unauthorized");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

type TokenIn = { token: string };

export const getAdminPlayed = createServerFn({ method: "POST" })
  .inputValidator((d: TokenIn) => ({ token: String(d?.token ?? "") }))
  .handler(async ({ data }) => {
    const db = await assertAdmin(data.token);
    const { data: rows } = await db.from("played_questions").select("question_id").eq("user_id", ADMIN_PLAYER_ID);
    return (rows ?? []).map((r) => r.question_id);
  });

export const markAdminPlayed = createServerFn({ method: "POST" })
  .inputValidator((d: TokenIn & { questionId: string }) => ({ token: String(d?.token ?? ""), questionId: String(d?.questionId ?? "") }))
  .handler(async ({ data }) => {
    const db = await assertAdmin(data.token);
    if (!data.questionId) return { ok: false };
    const { error } = await db.from("played_questions")
      .upsert({ question_id: data.questionId, user_id: ADMIN_PLAYER_ID }, { onConflict: "user_id,question_id" });
    return { ok: !error };
  });

export const resetAdminPlayed = createServerFn({ method: "POST" })
  .inputValidator((d: TokenIn) => ({ token: String(d?.token ?? "") }))
  .handler(async ({ data }) => {
    const db = await assertAdmin(data.token);
    const { error } = await db.from("played_questions").delete().eq("user_id", ADMIN_PLAYER_ID);
    return { ok: !error };
  });
