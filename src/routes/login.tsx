import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Mail, Lock, LogIn, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { HabwaLogo } from "@/components/habwa-logo";

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) navigate({ to: "/", replace: true });
    });
    return () => { active = false; };
  }, [navigate]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || password.length < 6) {
      toast.error("أدخل بريدك الإلكتروني وكلمة مرور من 6 أحرف على الأقل");
      return;
    }
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        toast.success("تم تسجيل الدخول");
        navigate({ to: "/", replace: true });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        if (data.session) {
          toast.success("تم إنشاء الحساب");
          navigate({ to: "/", replace: true });
        } else {
          toast.success("تم إنشاء الحساب. تحقق من بريدك الإلكتروني لتأكيد الحساب.");
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر إكمال العملية";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-7 shadow-xl">
        <div className="text-center space-y-3 mb-7">
          <HabwaLogo className="w-16 h-16 mx-auto" />
          <h1 className="text-3xl font-black text-foreground">حبوة</h1>
          <p className="text-sm text-muted-foreground font-bold">سجّل دخولك وابدأ اللعب مباشرة</p>
        </div>

        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-background mb-5">
          <button type="button" onClick={() => setMode("login")}
            className={`rounded-lg py-2.5 font-black text-sm ${mode === "login" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            تسجيل الدخول
          </button>
          <button type="button" onClick={() => setMode("signup")}
            className={`rounded-lg py-2.5 font-black text-sm ${mode === "signup" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            إنشاء حساب
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="sr-only">البريد الإلكتروني</span>
            <div className="relative">
              <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="البريد الإلكتروني" autoComplete="email" required
                className="w-full h-12 rounded-xl border border-border bg-background pr-11 pl-4 text-foreground outline-none focus:border-primary" />
            </div>
          </label>
          <label className="block">
            <span className="sr-only">كلمة المرور</span>
            <div className="relative">
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="كلمة المرور" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={6}
                className="w-full h-12 rounded-xl border border-border bg-background pr-11 pl-4 text-foreground outline-none focus:border-primary" />
            </div>
          </label>
          <button disabled={loading} className="w-full h-13 rounded-xl brand-gradient text-primary-foreground font-black text-lg flex items-center justify-center gap-2 disabled:opacity-50">
            {mode === "login" ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            {loading ? "جاري التنفيذ..." : mode === "login" ? "دخول" : "إنشاء الحساب"}
          </button>
        </form>
        <button type="button" onClick={() => navigate({ to: "/admin-login" })}
          className="mt-5 w-full text-center text-sm font-bold text-muted-foreground hover:text-primary transition-colors">
          دخول الإدارة
        </button>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "تسجيل الدخول — حبوة" },
      { name: "description", content: "سجّل دخولك إلى حبوة وابدأ لعبة الأسئلة مع فريقك مباشرة." },
      { property: "og:title", content: "تسجيل الدخول — حبوة" },
      { property: "og:description", content: "سجّل دخولك إلى حبوة وابدأ لعبة الأسئلة مع فريقك مباشرة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage });
