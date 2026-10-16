import { useState, useRef, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  KeyRound,
  Sparkles,
  MessageCircle,
  Crown,
  Star,
  X,
  ShieldCheck,
} from "lucide-react";
import { useLicenseStore } from "@/store/contentStore";
import { useGameStore } from "@/store/gameStore";
import { validateActivationKeyWithStatus } from "@/lib/habwa-db";
import { HabwaLogo } from "@/components/habwa-logo";

const ACTIVATED_KEY = "habwa-activated";
const ADMIN_ACTIVATED_KEY = "habwa-admin-activated";
const ACTIVE_CODE_KEY = "habwa-active-code";
const WHATSAPP_LINK = "https://wa.me/966558400522?text=%D8%A3%D8%B1%D9%8A%D8%AF%20%D8%A7%D9%84%D8%AD%D8%B5%D9%88%D9%84%20%D8%B9%D9%84%D9%89%20%D9%83%D9%88%D8%AF%20%D8%AA%D9%81%D8%B9%D9%8A%D9%84%20%D9%84%D8%B9%D8%A8%D8%A9%20%D8%AD%D8%A8%D9%88%D8%A9";

function ActivatePage() {
  const navigate = useNavigate();
  const { fetchFromCloud } = useLicenseStore();
  const { setActiveCode, setIsAdmin, loadHelpToolsFromCode } = useGameStore();
  const [code, setCode] = useState("");
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const adminInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Check if already activated (either as user or admin)
    if (typeof window !== "undefined") {
      const activated = window.localStorage.getItem(ACTIVATED_KEY);
      const adminActivated = window.localStorage.getItem(ADMIN_ACTIVATED_KEY);
      const savedCode = window.localStorage.getItem(ACTIVE_CODE_KEY);
      
      if (adminActivated === "1") {
        setIsAdmin(true);
        setActiveCode(null);
        navigate({ to: "/", replace: true });
        return;
      }
      
      if (activated === "1" && savedCode) {
        setActiveCode(savedCode);
        setIsAdmin(false);
        loadHelpToolsFromCode();
        navigate({ to: "/", replace: true });
        return;
      }
    }
    
    // Fetch latest activation keys from cloud with timeout
    const fetchWithTimeout = async () => {
      try {
        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 10000);
        });
        
        // Race between fetch and timeout
        await Promise.race([fetchFromCloud(), timeoutPromise]);
      } catch (error) {
        console.error('[v0] fetchFromCloud failed or timed out:', error);
        // Continue anyway - user can still try to activate
      } finally {
        setInitialLoading(false);
        inputRef.current?.focus();
      }
    };
    
    fetchWithTimeout();
  }, [navigate, fetchFromCloud, setActiveCode, setIsAdmin, loadHelpToolsFromCode]);



  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      toast.error("أدخل كود التفعيل");
      return;
    }

    setLoading(true);

    try {
      // Validate key from Supabase (cloud) with detailed status
      const result = await validateActivationKeyWithStatus(code.trim().toUpperCase());

      if (result.status === 'valid') {
        // Save to localStorage
        window.localStorage.setItem(ACTIVATED_KEY, "1");
        window.localStorage.setItem(ACTIVE_CODE_KEY, code.trim().toUpperCase());
        window.localStorage.removeItem(ADMIN_ACTIVATED_KEY);
        
        // Update game store
        setActiveCode(code.trim().toUpperCase());
        setIsAdmin(false);
        await loadHelpToolsFromCode();
        
        toast.success("تم التفعيل بنجاح! مرحباً بك في حبوة");
        navigate({ to: "/", replace: true });
      } else {
        setShake(true);
        setCode("");
        setTimeout(() => setShake(false), 500);
        
        // Show specific error message based on status
        switch (result.status) {
          case 'not_found':
            toast.error("كود التفعيل غير صحيح");
            break;
          case 'used':
            toast.error("انتهت استخدامات هذا الكود");
            break;
          case 'expired':
            toast.error("الكود منتهي الصلاحية");
            break;
          case 'error':
            toast.error("حدث خطأ في الاتصال، يرجى المحاولة مرة أخرى");
            break;
          default:
            toast.error("كود التفعيل غير صحيح");
        }
      }
    } catch (error) {
      console.error('[v0] Activation error:', error);
      setShake(true);
      setCode("");
      setTimeout(() => setShake(false), 500);
      toast.error("حدث خطأ في الاتصال، يرجى المحاولة مرة أخرى");
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground text-sm">جاري التحقق من الاتصال...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-background"
    >
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -right-32 w-96 h-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-1/4 -left-32 w-96 h-96 rounded-full bg-primary-glow/20 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/10 blur-3xl" />
        
        {/* Stars decoration */}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-foreground/30 rounded-full"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0.2, 0.8, 0.2],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className={`relative w-full max-w-md ${shake ? "animate-[shake_0.4s_ease-in-out]" : ""}`}
      >
        {/* Premium badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex justify-center mb-6"
        >
          <div className="inline-flex items-center gap-2 bg-warning/20 border border-warning/30 px-4 py-2 rounded-full">
            <Crown className="w-4 h-4 text-warning" />
            <span className="text-sm font-bold text-warning">النسخة التجارية</span>
            <Star className="w-3 h-3 text-warning fill-warning" />
          </div>
        </motion.div>

        {/* Main card */}
        <div className="bg-card/10 backdrop-blur-xl rounded-3xl border border-border shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="brand-gradient p-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.3 }}
              className="mx-auto w-fit mb-4"
            >
              <HabwaLogo className="w-20 h-20" />
            </motion.div>
            <h1 className="text-4xl font-black text-primary-foreground mb-2">حبوة</h1>
            <p className="text-primary-foreground/80 text-sm tracking-[0.3em] font-bold">HABWA</p>
            <p className="text-primary-foreground/90 mt-3 text-sm">لعبة الأسئلة والمعلومات للفرق</p>
          </div>

          {/* Form section */}
          <div className="p-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2 text-foreground/90">
                <KeyRound className="w-5 h-5 text-primary" />
                <span className="font-bold">أدخل كود التفعيل</span>
              </div>
              <p className="text-muted-foreground text-sm">
                للحصول على كود التفعيل، تواصل مع الإدارة
              </p>
            </div>

            <form onSubmit={handleActivate} className="space-y-4">
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="HABWA-XXXX"
                  className="w-full h-14 px-5 rounded-2xl bg-card/10 border-2 border-border text-foreground text-center text-xl font-bold tracking-wider placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:bg-card/15 transition-all"
                  autoComplete="off"
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !code.trim()}
                className="w-full h-14 brand-gradient hover:brightness-110 text-primary-foreground rounded-2xl font-black text-lg shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-3"
              >
                {loading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-6 h-6 border-3 border-primary-foreground/30 border-t-primary-foreground rounded-full"
                  />
                ) : (
                  <>
                    <ShieldCheck className="w-6 h-6" />
                    تفعيل
                  </>
                )}
              </button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-transparent px-4 text-muted-foreground">أو</span>
              </div>
            </div>

            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-12 bg-success/20 hover:bg-success/30 border border-success/30 text-success rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
            >
              <MessageCircle className="w-5 h-5" />
              تواصل مع الإدارة للحصول على كود
            </a>
          </div>
        </div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-muted-foreground text-xs mt-6"
        >
          جميع الحقوق محفوظة &copy; {new Date().getFullYear()} حبوة
        </motion.p>
      </motion.div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
      `}</style>
    </div>
  );
}

export const Route = createFileRoute("/activate")({
  head: () => ({
    meta: [
      { title: "تفعيل حبوة — أدخل رمز التفعيل" },
      { name: "description", content: "أدخل رمز التفعيل الخاص بك لبدء اللعب في حبوة، لعبة الأسئلة العربية للفرق." },
      { property: "og:title", content: "تفعيل حبوة — أدخل رمز التفعيل" },
      { property: "og:description", content: "أدخل رمز التفعيل الخاص بك لبدء اللعب في حبوة، لعبة الأسئلة العربية للفرق." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ActivatePage,
});
