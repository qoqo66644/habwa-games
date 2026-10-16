import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, LogOut, Mail, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useGameStore } from "@/store/gameStore";
import { toast } from "sonner";

function ProfilePage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("—");
  const { setActiveCode, setIsAdmin } = useGameStore();
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? "—"));
  }, []);
  const logout = async () => {
    await supabase.auth.signOut();
    setActiveCode(null);
    setIsAdmin(false);
    toast.success("تم تسجيل الخروج");
    navigate({ to: "/login", replace: true });
  };
  return (
    <div dir="rtl" className="min-h-screen bg-background px-4 py-8">
      <div className="max-w-xl mx-auto space-y-5">
        <button onClick={() => navigate({ to: "/" })} className="font-bold text-muted-foreground flex items-center gap-2">
          <ArrowRight className="w-5 h-5" /> الرئيسية
        </button>
        <div className="rounded-3xl border border-border bg-card p-7">
          <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mb-4"><User className="w-8 h-8 text-primary" /></div>
          <h1 className="text-2xl font-black">الملف الشخصي</h1>
          <div className="mt-5 rounded-2xl bg-background border border-border p-4 flex items-center gap-3">
            <Mail className="w-5 h-5 text-primary" /><span className="font-bold break-all">{email}</span>
          </div>
          <button onClick={logout} className="mt-5 w-full rounded-xl border border-border py-3 font-black flex items-center justify-center gap-2 hover:bg-accent">
            <LogOut className="w-5 h-5" /> تسجيل الخروج
          </button>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "حسابي — حبوة" },
      { name: "description", content: "بيانات حسابك في حبوة وتسجيل الخروج من الجهاز." },
      { property: "og:title", content: "حسابي — حبوة" },
      { property: "og:description", content: "بيانات حسابك في حبوة وتسجيل الخروج من الجهاز." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage });
