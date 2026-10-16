import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase as rawSupabase } from "@/integrations/supabase/client";

const supabase = rawSupabase as any;

function QRSecret() {
  const { id: token } = Route.useParams();
  const [item, setItem] = useState<{
    answer: string;
    answer_image_url: string | null;
    answer_video_url: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      setLoading(true);
      setInvalid(false);

      const { data, error } = await supabase.rpc("get_habwa_qr_content", {
        p_token: token,
      });

      if (!alive) return;

      if (error || !data?.[0]) {
        setItem(null);
        setInvalid(true);
      } else {
        setItem(data[0]);
      }
      setLoading(false);
    };

    void load();
    return () => { alive = false; };
  }, [token]);

  if (loading) {
    return (
      <main dir="rtl" className="min-h-screen bg-background flex items-center justify-center p-6">
        <Loader2 className="w-10 h-10 animate-spin text-primary" aria-label="جاري التحميل" />
      </main>
    );
  }

  if (invalid || !item) {
    return (
      <main dir="rtl" className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center font-black text-foreground">هذا الرمز غير صالح</div>
      </main>
    );
  }

  return (
    <main dir="rtl" className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-8">
      <section className="w-full max-w-3xl flex flex-col items-center justify-center gap-5">
        {item.answer_image_url ? (
          <>
            <img
              src={item.answer_image_url}
              alt={item.answer}
              className="block max-h-[75vh] max-w-full w-auto object-contain rounded-2xl"
              draggable={false}
            />
            {item.answer.trim() && (
              <div className="text-center text-4xl sm:text-6xl font-black text-foreground break-words">
                {item.answer}
              </div>
            )}
          </>
        ) : item.answer_video_url ? (
          <>
            <video
              src={item.answer_video_url}
              controls
              playsInline
              className="block max-h-[70vh] max-w-full w-full rounded-2xl bg-black"
            />
            {item.answer.trim() && (
              <div className="text-center text-4xl sm:text-6xl font-black text-foreground break-words">
                {item.answer}
              </div>
            )}
          </>
        ) : (
          <div className="text-center text-4xl sm:text-6xl font-black text-foreground break-words">
            {item.answer}
          </div>
        )}
      </section>
    </main>
  );
}

export const Route = createFileRoute("/qr/$id")({
  head: () => ({
    meta: [
      { title: "حبوة" },
      { name: "robots", content: "noindex,nofollow,noarchive" },
    ],
  }),
  component: QRSecret,
});
