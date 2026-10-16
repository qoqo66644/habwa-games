import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Layout } from "@/components/layout";
import { Play, ChevronLeft, BookOpen, Menu, X, User, History, MessageCircle, LogOut, ListChecks } from "lucide-react";
import { useContentStore } from "@/store/contentStore";
import { useGameStore } from "@/store/gameStore";
import { useMemo, useEffect, useState } from "react";
import { HabwaLogo } from "@/components/habwa-logo";
import { getActivationKeyData } from "@/lib/habwa-db";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function Home() {
  const navigate = useNavigate();
  const { categories, playedQuestionIds } = useContentStore();
  const { gameStatus, activeCode, isAdmin, setActiveCode, setIsAdmin } = useGameStore();
  const [remainingGames, setRemainingGames] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!activeCode || isAdmin) return;
    getActivationKeyData(activeCode).then((key) => setRemainingGames(key?.remaining_uses ?? 0));
  }, [activeCode, isAdmin]);

  const stats = useMemo(() => {
    const total = categories.reduce((s, c) => s + c.questions.length, 0);
    return {
      cats: categories.length,
      total,
      played: playedQuestionIds.length,
      remaining: Math.max(0, total - playedQuestionIds.length),
    };
  }, [categories, playedQuestionIds]);

  return (
    <Layout>
      <div className="relative max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-8">
        <div className="flex justify-start">
          <button type="button" onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen} aria-label="فتح القائمة"
            className="w-12 h-12 rounded-2xl border border-border bg-card flex items-center justify-center text-foreground hover:bg-accent transition-colors">
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
        {menuOpen && (
          <div className="absolute top-20 right-4 left-4 z-50 rounded-2xl border border-border bg-card shadow-2xl p-2 space-y-1">
            <button onClick={() => { setMenuOpen(false); navigate({ to: "/start-game" }); }} className="w-full text-right rounded-xl px-4 py-3 font-bold hover:bg-accent flex items-center gap-3"><Play className="w-5 h-5 text-primary" /> لعبة جديدة</button>
            <button onClick={() => { setMenuOpen(false); navigate({ to: "/start-game" }); }} className="w-full text-right rounded-xl px-4 py-3 font-bold hover:bg-accent flex items-center gap-3"><History className="w-5 h-5 text-primary" /> ألعابي</button>
            <button onClick={() => { setMenuOpen(false); navigate({ to: "/profile" }); }} className="w-full text-right rounded-xl px-4 py-3 font-bold hover:bg-accent flex items-center gap-3"><User className="w-5 h-5 text-primary" /> الملف الشخصي</button>
            <a href="https://wa.me/966558400522" target="_blank" rel="noreferrer" onClick={() => setMenuOpen(false)} className="w-full rounded-xl px-4 py-3 font-bold hover:bg-accent flex items-center gap-3"><MessageCircle className="w-5 h-5 text-primary" /> تواصل معنا</a>
            <button onClick={async () => { setMenuOpen(false); await supabase.auth.signOut(); setActiveCode(null); setIsAdmin(false); toast.success("تم تسجيل الخروج"); navigate({ to: "/login", replace: true }); }} className="w-full text-right rounded-xl px-4 py-3 font-bold hover:bg-accent flex items-center gap-3 text-destructive"><LogOut className="w-5 h-5" /> تسجيل الخروج</button>
          </div>
        )}
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4">
          <div className="inline-flex items-center gap-3 brand-gradient text-primary-foreground
            px-6 py-3 rounded-2xl shadow-lg">
            <HabwaLogo className="w-14 h-14" />
            <span className="font-black text-4xl tracking-wide">حبوة</span>
            <span className="text-sm tracking-[0.35em] text-primary-foreground/80 font-bold">HABWA</span>
          </div>
          <p className="text-muted-foreground text-lg font-bold">لعبة الأسئلة والمعلومات للفرق</p>
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="grid grid-cols-4 gap-3">
          {[
            { label: "الفئات",   value: stats.cats,      color: "text-primary" },
            { label: "الأسئلة", value: stats.total,     color: "text-primary" },
            { label: "ملعوبة",  value: stats.played,    color: "text-warning" },
            { label: "متبقية",  value: stats.remaining, color: "text-success" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-2xl border border-border bg-card
              p-3 text-center shadow-sm">
              <div className={`font-black text-2xl ${color}`}>{value}</div>
              <div className="text-xs text-muted-foreground mt-1 font-bold">{label}</div>
            </div>
          ))}
        </motion.div>

        {!isAdmin && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-3xl border-2 border-border bg-card p-5 shadow-sm flex items-center justify-between gap-4"
          >
            <div>
              <div className="text-sm text-muted-foreground font-bold">رصيد الألعاب الجديدة</div>
              <div className="text-3xl font-black text-primary mt-1">{remainingGames ?? "—"}</div>
            </div>
            <div className="text-sm text-muted-foreground font-bold text-left">
              اللعبة الجديدة تخصم مرة واحدة فقط<br />
              وإعادة الألعاب السابقة مجانية
            </div>
          </motion.div>
        )}

        {/* Active game notice */}
        {gameStatus === "playing" && (
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border border-warning/30 bg-warning/10 p-4
              flex items-center justify-between gap-4">
            <p className="text-warning font-bold text-sm">
              هناك لعبة جارية — تابع من حيث توقفت
            </p>
            <button onClick={() => navigate({ to: "/play", replace: false })}
              className="bg-warning hover:bg-warning/90 text-warning-foreground px-4 py-2
                rounded-xl font-bold text-sm flex items-center gap-1.5 transition-colors">
              استكمال اللعب <ChevronLeft className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* Actions */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 }} className="space-y-3">
          <button onClick={() => navigate({ to: "/start-game", replace: false })}
            className="w-full brand-gradient text-primary-foreground py-5 rounded-2xl
              font-black text-2xl shadow-lg hover:shadow-xl hover:scale-[1.01]
              transition-all flex items-center justify-center gap-3">
            <Play className="w-7 h-7 fill-primary-foreground" />
            لعبة جديدة
          </button>
          <button onClick={() => navigate({ to: "/start-game", replace: false })}
            className="w-full border-2 border-border bg-card text-foreground hover:bg-accent py-4 rounded-2xl font-black text-xl transition-all flex items-center justify-center gap-2">
            <History className="w-6 h-6" /> ألعابي
          </button>
        </motion.div>

        {/* How to play */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 0.22 }}
          className="rounded-2xl border border-border bg-card p-6 space-y-3 shadow-sm">
          <h2 className="font-black text-lg text-foreground flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            كيف تلعب؟
          </h2>
          <ol className="space-y-2 text-sm text-foreground font-bold list-decimal
            pr-5 marker:font-black marker:text-primary">
            <li>اختر فريقين وأعطِ كل فريق اسمه</li>
            <li>اختر 6 فئات من الأسئلة</li>
            <li>بالتناوب، اختر سؤالاً من اللوحة</li>
            <li>الفريق المجيب يحصل على نقاط السؤال</li>
            <li>عند انتهاء الأسئلة، الفريق الأعلى نقاطاً يفوز!</li>
          </ol>
        </motion.div>

        {/* Quick admin link */}
        <div className="flex justify-center">
          <button onClick={() => navigate({ to: "/admin", replace: false })}
            className="flex items-center gap-2 text-primary font-bold text-sm
              hover:text-primary/80 transition-colors">
            <ListChecks className="w-4 h-4" />
            إدارة الأسئلة والفئات
          </button>
        </div>
      </div>
    </Layout>
  );
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "حبوة — لعبة الأسئلة والمعلومات للفرق" },
      { name: "description", content: "لعبة أسئلة عربية تفاعلية للفرق: اختر الفئات، تنافس على النقاط، واستخدم وسائل المساعدة." },
      { property: "og:title", content: "حبوة — لعبة الأسئلة والمعلومات للفرق" },
      { property: "og:description", content: "لعبة أسئلة عربية تفاعلية للفرق: اختر الفئات، تنافس على النقاط، واستخدم وسائل المساعدة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});
