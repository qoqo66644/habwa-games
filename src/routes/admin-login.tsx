import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { KeyRound, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { verifyAdminPin } from "@/lib/admin-auth.functions";
import { useGameStore } from "@/store/gameStore";
import { HabwaLogo } from "@/components/habwa-logo";

const ADMIN_SESSION = "habwa-admin-unlocked";

function AdminLoginPage() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const { setIsAdmin, setActiveCode } = useGameStore();

  useEffect(() => inputRef.current?.focus(), []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!pin.trim()) return;
    setLoading(true);
    try {
      const result = await verifyAdminPin({ data: { pin: pin.trim() } });
      if (!result.success) {
        setPin("");
        toast.error("رمز المدير غير صحيح");
        return;
      }
      sessionStorage.setItem(ADMIN_SESSION, "1");
      if (result.token) sessionStorage.setItem("habwa-admin-token", result.token);
      setIsAdmin(true);
      setActiveCode(null);
      toast.success("تم تسجيل دخول المدير");
      navigate({ to: "/admin", replace: true });
    } catch {
      toast.error("تعذر التحقق من رمز المدير");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-xl">
        <div className="text-center space-y-3 mb-7">
          <HabwaLogo className="w-16 h-16 mx-auto" />
          <h1 className="text-2xl font-black">دخول الإدارة</h1>
          <p className="text-sm text-muted-foreground font-bold">هذه الصفحة منفصلة عن حسابات اللاعبين</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="relative">
            <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" />
            <input ref={inputRef} type="password" inputMode="numeric" autoComplete="off" value={pin}
              onChange={(e) => setPin(e.target.value)} placeholder="رمز المدير"
              className="w-full h-12 rounded-xl border border-border bg-background pr-11 pl-4 text-center tracking-[0.35em] text-foreground outline-none focus:border-primary" />
          </div>
          <button disabled={loading || !pin.trim()} className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-black flex items-center justify-center gap-2 disabled:opacity-50">
            <ShieldCheck className="w-5 h-5" />
            {loading ? "جاري التحقق..." : "دخول لوحة الإدارة"}
          </button>
        </form>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/admin-login")({
  head: () => ({
    meta: [
      { title: "دخول الإدارة — حبوة" },
      { name: "description", content: "صفحة دخول الإدارة لإدارة الفئات والأسئلة ومفاتيح التفعيل في حبوة." },
      { property: "og:title", content: "دخول الإدارة — حبوة" },
      { property: "og:description", content: "صفحة دخول الإدارة لإدارة الفئات والأسئلة ومفاتيح التفعيل في حبوة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminLoginPage });
