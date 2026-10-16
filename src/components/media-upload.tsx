import { useRef, useState } from "react";
import { ImagePlus, Loader2, Upload, Video } from "lucide-react";
import { toast } from "sonner";
import { uploadHabwaMedia } from "@/lib/media-upload";

export function MediaUpload({
  kind,
  value,
  onChange,
  label,
}: {
  kind: "image" | "video";
  value: string;
  onChange: (url: string) => void;
  label: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const accept = kind === "image" ? "image/jpeg,image/png,image/webp,image/gif" : "video/mp4,video/webm,video/ogg";

  const choose = async (file?: File) => {
    if (!file) return;
    setLoading(true);
    try {
      const url = await uploadHabwaMedia(file, kind);
      onChange(url);
      toast.success(`تم رفع ${kind === "image" ? "الصورة" : "الفيديو"}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر رفع الملف");
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-2">
      <span className="text-xs font-bold text-muted-foreground">{label}</span>
      <div className="flex flex-wrap gap-2 items-center">
        <input ref={ref} type="file" accept={accept} className="hidden" onChange={(e) => { void choose(e.target.files?.[0]); e.currentTarget.value = ""; }} />
        <button type="button" disabled={loading} onClick={() => ref.current?.click()} className="h-10 px-3 rounded-xl border border-border bg-muted hover:bg-muted/70 text-sm font-bold flex items-center gap-2 disabled:opacity-50">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : kind === "image" ? <ImagePlus className="w-4 h-4" /> : <Video className="w-4 h-4" />}
          {loading ? "جاري الرفع..." : "رفع من الجهاز"}
        </button>
        {value && <span className="text-[10px] text-success font-bold truncate max-w-[260px]">تم الرفع ✓</span>}
      </div>
      {value && (kind === "image" ? <img src={value} alt="معاينة" className="h-20 w-28 object-cover rounded-xl border border-border" /> : <video src={value} controls className="h-24 w-40 object-contain rounded-xl bg-black" />)}
    </div>
  );
}
