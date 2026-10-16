import { supabase } from "@/integrations/supabase/client";

const BUCKET = "habwa-media";
const MAX_SIZE = 500 * 1024 * 1024;
const ALLOWED = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "video/mp4", "video/webm", "video/ogg",
]);

export async function uploadHabwaMedia(file: File, kind: "image" | "video") {
  if (!ALLOWED.has(file.type)) throw new Error("نوع الملف غير مدعوم. استخدم JPG/PNG/WEBP أو MP4/WEBM/OGG.");
  if (file.size > MAX_SIZE) throw new Error("حجم الملف كبير جداً. الحد الأقصى 500MB.");
  if (kind === "image" && !file.type.startsWith("image/")) throw new Error("اختر صورة.");
  if (kind === "video" && !file.type.startsWith("video/")) throw new Error("اختر فيديو.");

  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const path = `${kind}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw new Error(error.message);

  // The bucket is private (public buckets are disabled for this workspace),
  // so we hand back a long-lived signed link (1 year).
  const { data, error: signError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 365);
  if (signError || !data) throw new Error(signError?.message || "تعذر إنشاء رابط الملف.");
  return data.signedUrl;
}
