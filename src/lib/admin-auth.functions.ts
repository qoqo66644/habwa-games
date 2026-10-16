import { createServerFn } from "@tanstack/react-start";

async function readStoredPin() {
  // Keep the emergency/admin access code independent from old game data.
  // The deployed environment value wins; 1234 is the intentional default.
  return process.env["ADMIN_SECRET_PIN"] ?? "1234";
}

export const verifyAdminPin = createServerFn({ method: "POST" })
  .inputValidator((data: { pin: string }) => data)
  .handler(async ({ data: { pin } }) => {
    const stored = await readStoredPin();
    const success = pin.trim() === stored;
    if (!success) return { success, token: null as string | null };
    const { makeAdminToken } = await import("./admin-played.functions");
    return { success, token: (await makeAdminToken()) as string | null };
  });

export const changeAdminPin = createServerFn({ method: "POST" })
  .inputValidator((data: { current: string; next: string }) => data)
  .handler(async ({ data }) => {
    const current = data.current.trim();
    const next = data.next.trim();
    const stored = await readStoredPin();
    if (current !== stored) {
      return { success: false, error: "WRONG_CURRENT" as const };
    }
    if (next.length < 4) {
      return { success: false, error: "TOO_SHORT" as const };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("admin_settings")
      .upsert({ id: true, pin: next, updated_at: new Date().toISOString() });
    if (error) {
      return { success: false, error: "SAVE_FAILED" as const };
    }
    return { success: true };
  });
