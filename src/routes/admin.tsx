import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Edit3,
  ChevronDown,
  ChevronUp,
  Play,
  RotateCcw,
  AlertTriangle,
  Image as ImageIcon,
  Save,
  X,
  ListChecks,
  FolderPlus,
  Lock,
  KeyRound,
  ShieldCheck,
  Sparkles,
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  Key,
  Copy,
  Crown,
  QrCode,
} from "lucide-react";
import { Layout } from "@/components/layout";
import { CategoryVisual, ICON_NAMES } from "@/lib/categoryIcon";
import { useContentStore, useLicenseStore } from "@/store/contentStore";
import type { Category, Difficulty, Question } from "@/data/questions";
import { HabwaLogo } from "@/components/habwa-logo";
import { AiQuestionModal } from "@/components/ai-question-modal";
import { generateAIQuestions, saveBatchQuestions } from "@/lib/ai-questions.functions";
import { isWalaKelmaCategory } from "@/lib/category-rules";
import type { GeneratedQuestionItem } from "@/lib/ai-questions.types";
import { verifyAdminPin, changeAdminPin } from "@/lib/admin-auth.functions";
import { MediaUpload } from "@/components/media-upload";
import { qrImageUrl } from "@/lib/qr";
import { useGameStore } from "@/store/gameStore";


const LEVELS: Difficulty[] = [200, 400, 600];
const PIN_SESSION = "habwa-admin-unlocked";

function Admin() {
  const navigate = useNavigate();
  const { setIsAdmin } = useGameStore();
  const [unlocked, setUnlocked] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.sessionStorage.getItem(PIN_SESSION) === "1";
  });

  useEffect(() => {
    if (!unlocked) {
      navigate({ to: "/admin-login", replace: true });
      return;
    }
    // Admin session is independent: full access, no activation key needed.
    setIsAdmin(true);
  }, [navigate, unlocked, setIsAdmin]);

  if (!unlocked) return null;

  return (
    <AdminDashboard
      onLock={() => {
        window.sessionStorage.removeItem(PIN_SESSION);
        setIsAdmin(false);
        setUnlocked(false);
        navigate({ to: "/admin-login", replace: true });
      }}
    />
  );
}

function PinGate({ onUnlock }: { onUnlock: () => void }) {
  const navigate = useNavigate();
  const [pin, setPin] = useState("");
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const tryUnlock = async (value: string) => {
    let ok = false;
    try {
      const res = await verifyAdminPin({ data: { pin: value } });
      ok = res.success;
      if (res.success && res.token) {
        sessionStorage.setItem("habwa-admin-unlocked", "1");
        sessionStorage.setItem("habwa-admin-token", res.token);
        void import("@/lib/habwa-db").then(({ fetchPlayedQuestions }) =>
          fetchPlayedQuestions().then((ids) => useContentStore.setState({ playedQuestionIds: ids })),
        );
      }
    } catch {
      ok = false;
    }
    if (ok) {
      toast.success("مرحباً بك في لوحة التحكم");
      onUnlock();
    } else {
      setShake(true);
      setPin("");
      setTimeout(() => setShake(false), 500);
      toast.error("الرمز غير صحيح");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length === 0) return;
    void tryUnlock(pin);
  };


  return (
    <div
      dir="rtl"
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-background"
    >
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full brand-gradient opacity-20 blur-3xl" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full brand-gradient opacity-15 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4 }}
        className={`relative w-full max-w-md bg-card rounded-3xl shadow-2xl border border-border p-8 space-y-6 ${
          shake ? "animate-[shake_0.4s_ease-in-out]" : ""
        }`}
      >
        <div className="flex flex-col items-center text-center space-y-3">
          <HabwaLogo className="w-16 h-16" />
          <div>
            <div className="text-3xl font-black flex items-center gap-2 justify-center">
              <span>حبوة</span>
              <span className="text-xs tracking-[0.3em] text-primary font-bold mt-2">HABWA</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              لوحة التحكم محمية. أدخل الرمز السري للمتابعة.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <KeyRound className="w-4 h-4 text-primary absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              ref={inputRef}
              type="password"
              inputMode="numeric"
              autoComplete="off"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\s/g, ""))}
              placeholder="••••"
              className="w-full h-14 pr-10 pl-4 rounded-2xl border-2 border-border bg-card text-center text-2xl font-black tracking-[0.6em] focus:outline-none focus:border-primary focus:ring-4 focus:ring-accent transition-all"
              maxLength={20}
            />
          </div>

          <button
            type="submit"
            disabled={!pin}
            className="w-full h-12 brand-gradient text-primary-foreground rounded-2xl font-black text-lg shadow-lg hover:shadow-xl hover:scale-[1.01] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-5 h-5" />
            دخول
          </button>
        </form>

        <button
          onClick={() => navigate({ to: "/", replace: false })}
          className="w-full text-center text-sm text-muted-foreground hover:text-primary font-bold transition-colors"
        >
          العودة للصفحة الرئيسية
        </button>
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

function AdminDashboard({ onLock }: { onLock: () => void }) {
  const navigate = useNavigate();
  const {
    categories,
    playedQuestionIds,
    addCategory,
    deleteCategory,
    resetPlayedHistory,
    resetAllContent,
  } = useContentStore();

  const stats = useMemo(() => {
    const totalQuestions = categories.reduce((s, c) => s + c.questions.length, 0);
    return {
      totalCategories: categories.length,
      totalQuestions,
      played: playedQuestionIds.length,
      remaining: Math.max(0, totalQuestions - playedQuestionIds.length),
    };
  }, [categories, playedQuestionIds]);

  const [newCatName, setNewCatName] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("Star");
  const [newCatImage, setNewCatImage] = useState("");

  const handleAddCategory = async () => {
    if (!newCatName.trim()) {
      toast.error("اكتب اسم الفئة");
      return;
    }
    await addCategory({ name: newCatName, iconKey: newCatIcon, iconUrl: newCatImage });
    setNewCatName("");
    setNewCatImage("");
    setNewCatIcon("Star");
    toast.success("تمت إضافة الفئة");
  };

  const handleDeleteCategory = async (cat: Category) => {
    if (!confirm(`حذف الفئة "${cat.name}" مع جميع أسئلتها؟`)) return;
    await deleteCategory(cat.id);
    toast.success("تم الحذف");
  };

  const [showPinModal, setShowPinModal] = useState(false);
  const [mode, setMode] = useState<"manual" | "import" | "licenses">("manual");
  const [aiAllLoading, setAiAllLoading] = useState(false);

  const generateAllCategories = async () => {
    if (!categories.length) { toast.error("أضف فئات أولاً"); return; }
    setAiAllLoading(true);
    let total = 0;
    try {
      for (const cat of categories) {
        const res = await generateAIQuestions({ data: { categoryId: cat.id, categoryName: cat.name } });
        if (res.questions.length) {
          const saved = await saveBatchQuestions({ data: { categoryId: cat.id, categoryName: cat.name, questions: res.questions } });
          total += saved.count;
        }
      }
      await useContentStore.getState().fetchFromCloud();
      toast.success(`تم توليد ${total} سؤال بالذكاء الاصطناعي`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذّر التوليد الذكي");
    } finally { setAiAllLoading(false); }
  };

  return (
    <Layout>
      <div dir="rtl" className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Top hero */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl bg-card border border-border shadow-sm p-6 flex flex-col md:flex-row items-center gap-6"
        >
          <div className="flex-1 text-center md:text-right space-y-2">
            <div className="flex items-center gap-2 justify-center md:justify-start">
              <h1 className="text-3xl font-black">لوحة إدارة الأسئلة</h1>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-success bg-success/10 px-2 py-1 rounded-full">
                <ShieldCheck className="w-3 h-3" />
                محمية
              </span>
            </div>
            <p className="text-muted-foreground text-sm">
              أضف وعدّل الفئات والأسئلة. الأسئلة الملعوبة سابقاً لن تتكرر تلقائياً في الألعاب القادمة.
            </p>
            <div className="flex items-center gap-2 justify-center md:justify-start pt-1">
              <button
                onClick={() => setShowPinModal(true)}
                className="text-xs font-bold text-primary hover:text-primary bg-accent hover:bg-accent/70 border border-border px-3 py-1.5 rounded-lg flex items-center gap-1.5"
              >
                <KeyRound className="w-3.5 h-3.5" />
                تغيير الرمز السري
              </button>
              <button
                onClick={onLock}
                className="text-xs font-bold text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/70 border border-border px-3 py-1.5 rounded-lg flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" />
                إقفال
              </button>
            </div>
          </div>
          <button
            onClick={() => navigate({ to: "/start-game", replace: false })}
            className="brand-gradient text-primary-foreground px-7 py-4 rounded-2xl font-black text-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all flex items-center gap-2"
          >
            <Play className="w-5 h-5" />
            ابدأ لعبة جديدة
          </button>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="عدد الفئات" value={stats.totalCategories} accent="text-primary" />
          <StatCard label="إجمالي الأسئلة" value={stats.totalQuestions} accent="text-primary" />
          <StatCard label="ملعوبة" value={stats.played} accent="text-primary" />
          <StatCard label="متبقية" value={stats.remaining} accent="text-success" />
        </div>

        {showPinModal && (
          <ChangePinModal onClose={() => setShowPinModal(false)} />
        )}

        {/* Reset bar */}
        <div className="rounded-2xl border border-warning/30 bg-warning/10 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2 text-warning text-sm">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              الأسئلة الملعوبة تُحفظ آلياً ولا تتكرر. لإعادة تدويرها استخدم زر التصفير.
            </span>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={async () => {
                if (confirm("تصفير سجل الأسئلة الملعوبة؟ ستظهر مجدداً في الألعاب القادمة.")) {
                  await resetPlayedHistory();
                  toast.success("تم تصفير السجل");
                }
              }}
              className="bg-card border border-warning/40 text-warning hover:bg-warning/10 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              تصفير سجل الأسئلة الملعوبة
            </button>
            <button
              onClick={async () => {
                if (confirm("حذف كل الفئات والأسئلة وإعادة الافتراضي؟ لا يمكن التراجع.")) {
                  await resetAllContent();
                  toast.success("تمت الإعادة للافتراضي");
                }
              }}
              className="bg-destructive/10 border border-destructive/30 text-destructive hover:bg-destructive/20 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              إعادة الافتراضي
            </button>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex justify-end">
          <button type="button" onClick={() => void generateAllCategories()} disabled={aiAllLoading} className="brand-gradient text-primary-foreground px-4 h-11 rounded-xl font-black flex items-center gap-2 shadow disabled:opacity-50">
            <Sparkles className="w-4 h-4" />
            {aiAllLoading ? "جاري توليد الأسئلة..." : "توليد أسئلة كل الفئات بالـAI"}
          </button>
        </div>

        <div className="rounded-2xl border border-border bg-card p-1.5 flex gap-1.5">
          <TabButton
            active={mode === "manual"}
            onClick={() => setMode("manual")}
            icon={<Edit3 className="w-4 h-4" />}
            label="الإدخال اليدوي"
          />
          <TabButton
            active={mode === "import"}
            onClick={() => setMode("import")}
            icon={<Upload className="w-4 h-4" />}
            label="الاستيراد السريع"
          />
          <TabButton
            active={mode === "licenses"}
            onClick={() => setMode("licenses")}
            icon={<Key className="w-4 h-4" />}
            label="إدارة التراخيص"
          />
        </div>

        {mode === "import" && <BulkImport onDone={() => setMode("manual")} />}

        {mode === "licenses" && <LicenseManagement />}

        {mode === "manual" && (
          <>
            {/* Add Category */}
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center gap-2 text-lg font-black">
                <FolderPlus className="w-5 h-5 text-primary" />
                إضافة فئة جديدة
              </div>
              <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_1fr_auto] gap-3 items-end">
                <Field label="اسم الفئة">
                  <input
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="مثل: تكنولوجيا"
                    className="input"
                  />
                </Field>
                <Field label="الأيقونة">
                  <select
                    value={newCatIcon}
                    onChange={(e) => setNewCatIcon(e.target.value)}
                    className="input"
                  >
                    {ICON_NAMES.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </Field>
                <MediaUpload kind="image" value={newCatImage} onChange={setNewCatImage} label="صورة الفئة (اختياري)" />
                <button
                  onClick={handleAddCategory}
                  className="brand-gradient text-primary-foreground h-11 px-5 rounded-xl font-bold flex items-center gap-2 shadow"
                >
                  <Plus className="w-4 h-4" />
                  إضافة
                </button>
              </div>
            </div>

            {/* Categories list */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-lg font-black">
                <ListChecks className="w-5 h-5 text-primary" />
                الفئات ({categories.length})
              </div>

              {categories.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
                  لا توجد فئات بعد. أضف فئة من الأعلى.
                </div>
              )}

              <AnimatePresence initial={false}>
                {categories.map((cat) => (
                  <CategoryRow
                    key={cat.id}
                    category={cat}
                    playedIds={playedQuestionIds}
                    onDelete={() => handleDeleteCategory(cat)}
                  />
                ))}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>

      <style>{`
        .input {
          width: 100%;
          height: 44px;
          padding: 0 12px;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: var(--card);
          font-size: 14px;
          outline: none;
        }
        .input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px var(--accent); }
        textarea.input { height: auto; padding: 10px 12px; min-height: 64px; resize: vertical; }
      `}</style>
    </Layout>
  );
}

function ChangePinModal({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next.length < 4) {
      toast.error("الرمز الجديد يجب أن يكون 4 خانات على الأقل");
      return;
    }
    if (next !== confirmPin) {
      toast.error("التأكيد لا يطابق الرمز الجديد");
      return;
    }
    setSaving(true);
    try {
      const res = await changeAdminPin({ data: { current: current.trim(), next: next.trim() } });
      if (!res.success) {
        toast.error(
          res.error === "WRONG_CURRENT"
            ? "الرمز الحالي غير صحيح"
            : res.error === "TOO_SHORT"
              ? "الرمز الجديد يجب أن يكون 4 خانات على الأقل"
              : "تعذر تحديث الرمز السري",
        );
        return;
      }
      toast.success("تم تحديث الرمز السري");
      onClose();
    } catch {
      toast.error("تعذر تحديث الرمز السري");
    } finally {
      setSaving(false);
    }
  };
  void saving;


  return (
    <div
      className="fixed inset-0 bg-overlay backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 brand-gradient rounded-xl flex items-center justify-center">
              <KeyRound className="w-5 h-5 text-primary-foreground" />
            </div>
            <h3 className="font-black text-xl">تغيير الرمز السري</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <Field label="الرمز الحالي">
            <input type="password" inputMode="numeric" className="input" value={current} onChange={(e) => setCurrent(e.target.value)} autoFocus />
          </Field>
          <Field label="الرمز الجديد (4 خانات على الأقل)">
            <input type="password" inputMode="numeric" className="input" value={next} onChange={(e) => setNext(e.target.value)} />
          </Field>
          <Field label="تأكيد الرمز الجديد">
            <input type="password" inputMode="numeric" className="input" value={confirmPin} onChange={(e) => setConfirmPin(e.target.value)} />
          </Field>

          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="bg-secondary hover:bg-secondary/80 text-secondary-foreground px-4 h-10 rounded-xl text-sm font-bold">
              إلغاء
            </button>
            <button type="submit" className="brand-gradient text-primary-foreground px-5 h-10 rounded-xl text-sm font-bold flex items-center gap-1.5 shadow">
              <Save className="w-4 h-4" />
              حفظ
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 text-center">
      <div className={`text-3xl font-black ${accent}`}>{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-bold text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function CategoryRow({
  category,
  playedIds,
  onDelete,
}: {
  category: Category;
  playedIds: string[];
  onDelete: () => void;
}) {
  const { updateCategory } = useContentStore();
  const [aiOpen, setAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiQuestions, setAiQuestions] = useState<GeneratedQuestionItem[]>([]);

  const runGenerate = async () => {
    setAiOpen(true);
    setAiLoading(true);
    setAiQuestions([]);
    try {
      const res = await generateAIQuestions({
        data: { categoryId: category.id, categoryName: category.name },
      });
      setAiQuestions(res.questions);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذّر توليد الأسئلة");
      setAiOpen(false);
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiSave = async (items: GeneratedQuestionItem[]) => {
    try {
      const res = await saveBatchQuestions({ data: { categoryId: category.id, categoryName: category.name, questions: items } });
      toast.success(`تم حفظ ${res.count} أسئلة في البنك`);
      await useContentStore.getState().fetchFromCloud();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذّر حفظ الأسئلة");
    }
  };

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [iconKey, setIconKey] = useState(category.iconKey);
  const [iconUrl, setIconUrl] = useState(category.iconUrl ?? "");

  const counts = useMemo(() => {
    const by: Record<Difficulty, number> = { 200: 0, 400: 0, 600: 0 };
    for (const q of category.questions) by[q.level] += 1;
    return by;
  }, [category.questions]);

  const playedCount = useMemo(
    () => category.questions.filter((q) => playedIds.includes(q.id)).length,
    [category.questions, playedIds],
  );

  const saveEdits = async () => {
    if (!name.trim()) { toast.error("اسم الفئة مطلوب"); return; }
    await updateCategory(category.id, { name: name.trim(), iconKey, iconUrl });
    setEditing(false);
    toast.success("تم الحفظ");
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className="rounded-2xl border border-border bg-card overflow-hidden"
    >
      <div className="p-4 flex items-center gap-4">
        <div className="brand-gradient w-12 h-12 rounded-xl flex items-center justify-center text-primary-foreground shrink-0 shadow">
          <CategoryVisual iconKey={category.iconKey} iconUrl={category.iconUrl} className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-black text-lg truncate">{category.name}</div>
          <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
            <span>200: <b className="text-foreground">{counts[200]}</b></span>
            <span>400: <b className="text-foreground">{counts[400]}</b></span>
            <span>600: <b className="text-foreground">{counts[600]}</b></span>
            <span>الإجمالي: <b className="text-foreground">{category.questions.length}</b></span>
            {playedCount > 0 && <span className="text-primary">ملعوبة: <b>{playedCount}</b></span>}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={runGenerate}
            title="توليد أسئلة بالذكاء الاصطناعي"
            className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary flex items-center gap-1 text-sm font-bold"
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">توليد ذكي</span>
          </button>
          <button onClick={() => setEditing((v) => !v)} className="p-2 rounded-lg bg-muted hover:bg-muted/70 text-muted-foreground">
            <Edit3 className="w-4 h-4" />
          </button>

          <button onClick={onDelete} className="p-2 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive">
            <Trash2 className="w-4 h-4" />
          </button>
          <button onClick={() => setOpen((v) => !v)} className="p-2 rounded-lg bg-muted hover:bg-muted/70 text-muted-foreground flex items-center gap-1 text-sm font-bold">
            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            <span className="hidden sm:inline">الأسئلة</span>
          </button>
        </div>
      </div>

      {editing && (
        <div className="border-t border-border bg-surface p-4">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_1fr_auto] gap-3 items-end">
            <Field label="اسم الفئة">
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="الأيقونة">
              <select className="input" value={iconKey} onChange={(e) => setIconKey(e.target.value)}>
                {ICON_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </Field>
            <MediaUpload kind="image" value={iconUrl} onChange={setIconUrl} label="صورة الفئة (اختياري)" />
            <div className="flex gap-2">
              <button onClick={saveEdits} className="bg-success hover:bg-success/90 text-success-foreground h-11 px-4 rounded-xl font-bold flex items-center gap-2">
                <Save className="w-4 h-4" />حفظ
              </button>
              <button
                onClick={() => { setEditing(false); setName(category.name); setIconKey(category.iconKey); setIconUrl(category.iconUrl ?? ""); }}
                className="bg-secondary hover:bg-secondary/80 text-secondary-foreground h-11 px-3 rounded-xl"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {open && (
        <div className="border-t border-border bg-surface p-4 space-y-4">
          <QuestionsByLevel category={category} playedIds={playedIds} />
          <AddQuestionForm categoryId={category.id} />
        </div>
      )}

      <AiQuestionModal
        isOpen={aiOpen}
        categoryName={category.name}
        questions={aiQuestions}
        isLoading={aiLoading}
        onClose={() => setAiOpen(false)}
        onSave={handleAiSave}
        onRegenerate={runGenerate}
      />
    </motion.div>

  );
}

function QuestionsByLevel({ category, playedIds }: { category: Category; playedIds: string[] }) {
  const grouped = useMemo(() => {
    const by: Record<Difficulty, Question[]> = { 200: [], 400: [], 600: [] };
    for (const q of category.questions) by[q.level].push(q);
    return by;
  }, [category.questions]);

  if (category.questions.length === 0) {
    return (
      <div className="text-sm text-muted-foreground rounded-xl border border-dashed border-border bg-card p-6 text-center">
        لا توجد أسئلة في هذه الفئة بعد.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {LEVELS.map((level) => (
        <div key={level} className="space-y-2">
          <div className="text-xs font-black text-muted-foreground">
            مستوى {level} نقطة ({grouped[level].length})
          </div>
          <div className="space-y-2">
            {grouped[level].map((q) => (
              <QuestionItem
                key={q.id}
                categoryId={category.id}
                question={q}
                isPlayed={playedIds.includes(q.id)}
              />
            ))}
            {grouped[level].length === 0 && (
              <div className="text-xs text-muted-foreground italic px-2">— لا أسئلة —</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function QuestionItem({
  categoryId,
  question,
  isPlayed,
}: {
  categoryId: string;
  question: Question;
  isPlayed: boolean;
}) {
  const { updateQuestion, deleteQuestion } = useContentStore();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(question.question);
  const [answer, setAnswer] = useState(question.answer);
  const [imageUrl, setImageUrl] = useState(question.imageUrl ?? "");
  const [answerImageUrl, setAnswerImageUrl] = useState(question.answerImageUrl ?? "");
  const [videoUrl, setVideoUrl] = useState(question.videoUrl ?? "");
  const [answerVideoUrl, setAnswerVideoUrl] = useState(question.answerVideoUrl ?? "");
  const [qrEnabled, setQrEnabled] = useState(question.qrEnabled ?? false);

  const save = async () => {
    if (!text.trim() || !answer.trim()) { toast.error("نص السؤال والإجابة مطلوبان"); return; }
    await updateQuestion(categoryId, question.id, { question: text.trim(), answer: answer.trim(), imageUrl, answerImageUrl, videoUrl, answerVideoUrl, qrEnabled });
    setEditing(false);
    toast.success("تم الحفظ");
  };

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      {!editing ? (
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0 space-y-1">
            <div className="font-bold text-sm leading-snug flex items-start gap-2">
              {question.qrEnabled ? <QrCode className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" /> : question.imageUrl && <ImageIcon className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />}
              <span>{question.question}</span>
            </div>
            <div className="text-xs text-success flex items-center gap-2">
              <span className="font-bold">الإجابة:</span>
              {question.answerImageUrl && <ImageIcon className="w-3 h-3 text-success" />}
              <span>{question.answer}</span>
            </div>
            {isPlayed && (
              <span className="inline-block text-[10px] font-bold text-primary bg-accent px-2 py-0.5 rounded-full">ملعوب سابقاً</span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg bg-muted hover:bg-muted/70 text-muted-foreground">
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={async () => { if (confirm("حذف هذا السؤال؟")) { await deleteQuestion(categoryId, question.id); toast.success("تم الحذف"); } }}
              className="p-1.5 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Field label="نص السؤال">
            <textarea className="input" value={text} onChange={(e) => setText(e.target.value)} rows={2} />
          </Field>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <MediaUpload kind="image" value={imageUrl} onChange={setImageUrl} label="صورة السؤال" />
            <Field label="الإجابة الصحيحة">
              <input className="input" value={answer} onChange={(e) => setAnswer(e.target.value)} />
            </Field>
          </div>
          <MediaUpload kind="image" value={answerImageUrl} onChange={setAnswerImageUrl} label="صورة الإجابة" />
          <MediaUpload kind="video" value={videoUrl} onChange={setVideoUrl} label="فيديو السؤال" />
          <MediaUpload kind="video" value={answerVideoUrl} onChange={setAnswerVideoUrl} label="فيديو الإجابة" />
          <label className="flex items-center gap-2 text-sm font-bold rounded-xl border border-border bg-muted/40 p-3">
            <input type="checkbox" checked={qrEnabled} onChange={(e) => setQrEnabled(e.target.checked)} />
            <QrCode className="w-4 h-4 text-primary" /> تفعيل هذا السؤال كـ QR سري
          </label>
          {qrEnabled && question.id && (
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-3 flex flex-wrap items-center gap-4">
              {question.qrToken ? (
                <img src={qrImageUrl(question.qrToken, 180)} alt="QR" className="w-32 h-32 shrink-0 bg-white rounded-xl p-2 object-contain" />
              ) : (
                <div className="w-32 h-32 shrink-0 rounded-xl bg-white/10 border border-border flex items-center justify-center text-xs text-muted-foreground text-center p-2">جاري تجهيز الباركود…</div>
              )}
              <div className="text-xs text-muted-foreground">
                <b className="block text-foreground mb-1">QR جاهز</b> عند المسح يفتح بطاقة السر لهذا المحتوى.
              </div>
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setEditing(false); setText(question.question); setAnswer(question.answer); setImageUrl(question.imageUrl ?? ""); setAnswerImageUrl(question.answerImageUrl ?? ""); setVideoUrl(question.videoUrl ?? ""); setAnswerVideoUrl(question.answerVideoUrl ?? ""); setQrEnabled(question.qrEnabled ?? false); }}
              className="bg-secondary hover:bg-secondary/80 text-secondary-foreground px-3 h-9 rounded-lg text-sm"
            >إلغاء</button>
            <button onClick={save} className="bg-success hover:bg-success/90 text-success-foreground px-4 h-9 rounded-lg text-sm font-bold flex items-center gap-1.5">
              <Save className="w-3.5 h-3.5" />حفظ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AddQuestionForm({ categoryId }: { categoryId: string }) {
  const { addQuestion } = useContentStore();
  const category = useContentStore((state) => state.categories.find((item) => item.id === categoryId));
  const autoQrEnabled = category ? isWalaKelmaCategory(category.name) : false;
  const [level, setLevel] = useState<Difficulty>(200);
  const [text, setText] = useState("");
  const [answer, setAnswer] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [answerImageUrl, setAnswerImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [answerVideoUrl, setAnswerVideoUrl] = useState("");
  const [qrEnabled, setQrEnabled] = useState(false);

  const submit = async () => {
    if (!text.trim() || !answer.trim()) { toast.error("نص السؤال والإجابة مطلوبان"); return; }
    const result = await addQuestion(categoryId, { level, question: text, answer, imageUrl, answerImageUrl, videoUrl, answerVideoUrl, qrEnabled: autoQrEnabled || qrEnabled });
    if (result === null) { toast.error("هذا السؤال موجود مسبقاً (تكرار)"); return; }
    setText(""); setAnswer(""); setImageUrl(""); setAnswerImageUrl(""); setVideoUrl(""); setAnswerVideoUrl(""); setQrEnabled(false);
    toast.success("تمت إضافة السؤال");
  };

  return (
    <div className="rounded-xl border border-dashed border-primary/40 bg-card p-4 space-y-3">
      <div className="flex items-center gap-2 font-bold text-sm text-primary">
        <Plus className="w-4 h-4" />إضافة سؤال جديد
      </div>
      <div className="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-2">
        <Field label="المستوى">
          <select className="input" value={level} onChange={(e) => setLevel(Number(e.target.value) as Difficulty)}>
            {LEVELS.map((l) => <option key={l} value={l}>{l} نقطة</option>)}
          </select>
        </Field>
        <Field label="نص السؤال">
          <textarea className="input" value={text} onChange={(e) => setText(e.target.value)} rows={2} />
        </Field>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <MediaUpload kind="image" value={imageUrl} onChange={setImageUrl} label="صورة السؤال" />
        <Field label="الإجابة الصحيحة">
          <input className="input" value={answer} onChange={(e) => setAnswer(e.target.value)} />
        </Field>
      </div>
      <MediaUpload kind="image" value={answerImageUrl} onChange={setAnswerImageUrl} label="صورة الإجابة" />
      <MediaUpload kind="video" value={videoUrl} onChange={setVideoUrl} label="فيديو السؤال" />
      <MediaUpload kind="video" value={answerVideoUrl} onChange={setAnswerVideoUrl} label="فيديو الإجابة" />
      <label className="flex items-center gap-2 text-sm font-bold rounded-xl border border-border bg-muted/40 p-3">
        <input type="checkbox" checked={autoQrEnabled || qrEnabled} disabled={autoQrEnabled} onChange={(e) => setQrEnabled(e.target.checked)} />
        <QrCode className="w-4 h-4 text-primary" /> {autoQrEnabled ? "QR مفعّل تلقائياً لفئة ولا كلمة" : "تفعيل هذا السؤال كـ QR سري"}
      </label>
      <div className="flex justify-end">
        <button onClick={submit} className="brand-gradient text-primary-foreground px-5 h-10 rounded-xl font-bold text-sm flex items-center gap-2 shadow">
          <Plus className="w-4 h-4" />إضافة السؤال
        </button>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 h-12 rounded-xl font-black text-base flex items-center justify-center gap-2 transition-all ${
        active ? "brand-gradient text-primary-foreground shadow" : "bg-transparent text-muted-foreground hover:bg-muted"
      }`}
    >
      {icon}{label}
    </button>
  );
}

type ImportRow = { categoryName: string; question: string; answer: string; level: Difficulty; imageUrl?: string | undefined; answerImageUrl?: string | undefined };
type ImportError = { line: number; raw: string; reason: string };

function parseBulk(text: string): { rows: ImportRow[]; errors: ImportError[] } {
  const lines = text.split(/\r\n|\r|\n|\u2028|\u2029/);
  const rows: ImportRow[] = [];
  const errors: ImportError[] = [];
  const toLatinDigits = (v: string) => v.replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06F0));

  lines.forEach((rawLine, i) => {
    try {
      const line = rawLine.replace(/[\u200e\u200f\ufeff]/g, "").trim();
      if (!line || line.startsWith("#")) return;
      const sep = line.includes("|") ? /[|｜]/ : line.includes("\t") ? /\t/ : /[|｜]/;
      const parts = line.split(sep).map((p) => p.trim());
      while (parts.length && parts[parts.length - 1] === "") parts.pop();
      let categoryName = "", question = "", answer = "", pointsRaw = "", imageUrl = "", answerImageUrl = "";
      if (parts.length >= 4) {
        [categoryName = "", question = "", answer = "", pointsRaw = "", imageUrl = "", answerImageUrl = ""] = parts;
      } else if (parts.length === 3 && isWalaKelmaCategory(parts[0] ?? "")) {
        // ولا كلمة: الفئة | الكلمة | النقاط — الكلمة هي السؤال والإجابة
        [categoryName = "", question = "", pointsRaw = ""] = parts;
        answer = question;
      } else {
        errors.push({ line: i + 1, raw: rawLine, reason: "السطر يحتاج 4 حقول على الأقل: الفئة | السؤال | الإجابة | النقاط" });
        return;
      }
      if (!categoryName || !question || !answer) { errors.push({ line: i + 1, raw: rawLine, reason: "أحد الحقول الأساسية فارغ" }); return; }
      const pts = Number(toLatinDigits(pointsRaw).replace(/[^\d]/g, ""));
      if (![200, 400, 600].includes(pts)) { errors.push({ line: i + 1, raw: rawLine, reason: `النقاط يجب أن تكون 200 أو 400 أو 600 (المُدخل: "${pointsRaw}")` }); return; }
      rows.push({ categoryName, question, answer, level: pts as Difficulty, imageUrl: imageUrl || undefined, answerImageUrl: answerImageUrl || undefined });
    } catch {
      errors.push({ line: i + 1, raw: rawLine, reason: "تعذّرت قراءة السطر" });
    }
  });

  return { rows, errors };
}

const SAMPLE_IMPORT = `# الصيغة: الفئة | السؤال | الإجابة | النقاط (200/400/600) | رابط صورة السؤال (اختياري) | رابط صورة الإجابة (اختياري)
# الأسطر التي تبدأ بـ # تُتجاهل. الفئات الجديدة تُنشأ تلقائياً.
كرة | من هو الهداف التاريخي لكأس العالم؟ | كلوزه | 200 |
كرة | في أي عام أُسس نادي برشلونة؟ | 1899 | 400 |
كرة | كم مرة فاز ميسي بالكرة الذهبية؟ | 8 مرات | 600 |
تاريخ | متى انتهت الحرب العالمية الثانية؟ | 1945 | 200 |
تاريخ | من فتح القسطنطينية؟ | محمد الفاتح | 400 |
تاريخ | في أي قرن ميلادي حدثت معركة حطين؟ | القرن 12 | 600 |`;

function BulkImport({ onDone }: { onDone: () => void }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<{ added: number; createdCategories: string[]; errors: ImportError[] } | null>(null);

  const handleProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) { toast.error("الصق الأسئلة أولاً"); return; }
    const { rows, errors } = parseBulk(text);
    if (rows.length === 0) { setResult({ added: 0, createdCategories: [], errors }); toast.error("لم يُستورد أي سؤال — راجع الأخطاء أدناه"); return; }

    const store = useContentStore.getState();
    const nameToId = new Map(store.categories.map((c) => [c.name.trim(), c.id]));
    const created: string[] = [];
    const allErrors = [...errors];
    let added = 0;

    for (const row of rows) {
      try {
        let id = nameToId.get(row.categoryName.trim());
        if (!id) {
          id = await useContentStore.getState().addCategory({ name: row.categoryName.trim(), iconKey: "Star" });
          nameToId.set(row.categoryName.trim(), id);
          created.push(row.categoryName);
        }
        const qid = await useContentStore.getState().addQuestion(id, { level: row.level, question: row.question, answer: row.answer, imageUrl: row.imageUrl, answerImageUrl: row.answerImageUrl, qrEnabled: isWalaKelmaCategory(row.categoryName) });
        if (qid) added++;
        else allErrors.push({ line: 0, raw: `${row.categoryName} | ${row.question}`, reason: "السؤال مكرر أو تعذّر حفظه — تم تجاهله" });
      } catch {
        allErrors.push({ line: 0, raw: `${row.categoryName} | ${row.question}`, reason: "تعذّر حفظ السؤال — تم تجاهله" });
      }
    }

    setResult({ added, createdCategories: created, errors: allErrors });
    if (added > 0) toast.success(`تم استيراد ${added} سؤال بنجاح${created.length ? ` وإنشاء ${created.length} فئة جديدة` : ""}`);
    else toast.error("لم يُستورد أي سؤال — راجع الأخطاء أدناه");
    setText("");
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-lg font-black">
          <FileText className="w-5 h-5 text-primary" />استيراد سريع للأسئلة
        </div>
        <button type="button" onClick={() => setText(SAMPLE_IMPORT)} className="text-xs font-bold text-primary hover:text-primary bg-accent hover:bg-accent/70 border border-border px-3 py-1.5 rounded-lg flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />ملء بمثال
        </button>
      </div>

      <div className="rounded-xl bg-accent border border-border p-4 text-xs text-foreground leading-relaxed space-y-1.5">
        <div className="font-bold text-primary flex items-center gap-1.5 mb-1"><Upload className="w-3.5 h-3.5" />صيغة كل سطر:</div>
        <code className="block bg-card rounded-md px-2 py-1.5 text-[11px] font-mono text-foreground border border-border leading-relaxed" dir="ltr">
          الفئة | السؤال | الإجابة | النقاط (200/400/600) | رابط صورة السؤال (اختياري) | رابط صورة الإجابة (اختياري)
        </code>
        <ul className="list-disc pr-5 space-y-0.5 mt-2">
          <li>افصل الحقول بالعلامة <code className="bg-card px-1 rounded">|</code></li>
          <li>الفئات غير الموجودة ستُنشأ تلقائياً</li>
          <li>الأسطر التي تبدأ بـ <code className="bg-card px-1 rounded">#</code> تُتجاهل</li>
        </ul>
      </div>

      <form onSubmit={handleProcess} className="space-y-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="الصق أسطر الأسئلة هنا..."
          rows={12}
          dir="rtl"
          spellCheck={false}
          className="input"
          style={{ fontFamily: 'ui-monospace, "SFMono-Regular", "Menlo", monospace', fontSize: 13, lineHeight: 1.7, minHeight: 220, width: "100%", height: "auto", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--card)", outline: "none" }}
        />
        <div className="flex flex-col sm:flex-row gap-2 justify-end">
          {text && (
            <button type="button" onClick={() => { setText(""); setResult(null); }} className="bg-muted hover:bg-muted/70 text-muted-foreground px-4 h-11 rounded-xl text-sm font-bold">مسح</button>
          )}
          <button type="submit" className="brand-gradient text-primary-foreground px-6 h-11 rounded-xl font-bold flex items-center justify-center gap-2 shadow">
            <Upload className="w-4 h-4" />معالجة واستيراد
          </button>
        </div>
      </form>

      {result && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 pt-2 border-t border-border">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <ResultStat icon={<CheckCircle2 className="w-4 h-4" />} label="استوردت" value={result.added} tone="success" />
            <ResultStat icon={<FolderPlus className="w-4 h-4" />} label="فئات جديدة" value={result.createdCategories.length} tone="info" />
            <ResultStat icon={<XCircle className="w-4 h-4" />} label="أسطر بأخطاء" value={result.errors.length} tone={result.errors.length ? "error" : "muted"} />
          </div>
          {result.createdCategories.length > 0 && (
            <div className="text-xs text-primary bg-accent border border-border rounded-lg p-3">
              <span className="font-bold">فئات أُنشئت تلقائياً:</span> {result.createdCategories.join("، ")} — يمكنك تغيير أيقوناتها من تبويب &quot;الإدخال اليدوي&quot;.
            </div>
          )}
          {result.errors.length > 0 && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 space-y-2">
              <div className="text-xs font-bold text-destructive flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5" />أخطاء الاستيراد ({result.errors.length})</div>
              <ul className="space-y-1.5 max-h-48 overflow-y-auto">
                {result.errors.map((err, i) => (
                  <li key={i} className="text-xs bg-card rounded-md p-2 border border-destructive/20">
                    <div className="font-bold text-destructive">{err.line > 0 ? `السطر ${err.line}: ` : ""}{err.reason}</div>
                    <div className="text-muted-foreground mt-0.5 truncate" dir="ltr">{err.raw || "(فارغ)"}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {result.added > 0 && (
            <button type="button" onClick={onDone} className="w-full h-11 rounded-xl bg-success hover:bg-success/90 text-success-foreground font-bold flex items-center justify-center gap-2">
              <Edit3 className="w-4 h-4" />عرض الأسئلة المستوردة في الإدخال اليدوي
            </button>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

function ResultStat({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: "success" | "info" | "error" | "muted" }) {
  const styles = { success: "border-success/30 bg-success/10 text-success", info: "border-primary/30 bg-accent text-primary", error: "border-destructive/30 bg-destructive/10 text-destructive", muted: "border-border bg-muted text-muted-foreground" }[tone];
  return (
    <div className={`rounded-xl border p-3 flex items-center gap-2 ${styles}`}>
      {icon}
      <div className="flex-1">
        <div className="text-[10px] font-bold opacity-80">{label}</div>
        <div className="text-xl font-black leading-none">{value}</div>
      </div>
    </div>
  );
}

function LicenseManagement() {
  const { activationKeys, addActivationKey, removeActivationKey, isLoading, fetchFromCloud } = useLicenseStore();
  const [newKey, setNewKey] = useState("");
  const [newKeyUses, setNewKeyUses] = useState<number>(10);
  const [copied, setCopied] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Fetch latest keys on mount
  useEffect(() => {
    const doFetch = async () => {
      try {
        setFetchError(null);
        await fetchFromCloud();
      } catch (err) {
        setFetchError("فشل الاتصال بقاعدة البيانات. تحقق من اتصال الإنترنت.");
        console.error('[v0] Error fetching keys:', err);
      }
    };
    doFetch();
  }, [fetchFromCloud]);

  const handleAddKey = async () => {
    const trimmed = newKey.trim().toUpperCase();
    if (!trimmed) {
      toast.error("أدخل كود التفعيل");
      return;
    }
    if (trimmed.length < 4) {
      toast.error("كود التفعيل يجب أن يكون 4 أحرف على الأقل");
      return;
    }
    if (newKeyUses < 1) {
      toast.error("عدد المحاولات يجب أن يكون 1 على الأقل");
      return;
    }
    setIsSaving(true);
    try {
      const added = await addActivationKey(trimmed, newKeyUses);
      if (added) {
        setNewKey("");
        setNewKeyUses(10);
        toast.success(`تمت إضافة الكود: ${trimmed} بـ ${newKeyUses} محاولة`);
      } else {
        toast.error("هذا الكود موجود مسبقاً أو حدث خطأ");
      }
    } catch (err) {
      toast.error("فشل إضافة الكود. تحقق من اتصال الإنترنت.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteKey = async (key: string) => {
    if (!confirm(`حذف الكود "${key}"?\n\nتنبيه: أي مستخدم فعّل اللعبة بهذا الكود سيبقى مفعلاً حتى يمسح بيانات المتصفح.`)) return;
    try {
      await removeActivationKey(key);
      toast.success("تم حذف الكود");
    } catch (err) {
      toast.error("فشل حذف الكود. تحقق من اتصال الإنترنت.");
    }
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
    toast.success("تم نسخ الكود");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Error alert */}
      {fetchError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
          <div className="flex-1">
            <div className="font-bold text-destructive text-sm">{fetchError}</div>
            <button 
              onClick={() => fetchFromCloud()} 
              className="text-xs text-destructive hover:text-destructive/80 underline mt-1"
            >
              إعادة المحاولة
            </button>
          </div>
        </div>
      )}

      {/* Header card */}
      <div className="rounded-2xl border border-warning/30 bg-warning/10 p-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-warning rounded-2xl flex items-center justify-center shadow-lg shrink-0">
            <Crown className="w-7 h-7 text-warning-foreground" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-black text-foreground flex items-center gap-2">
              إدارة التراخيص وأكواد التفعيل
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              أضف أكواد تفعيل جديدة مع تحديد عدد المحاولات. عند الضغط على &quot;بدء لعبة جديدة&quot; تُخصم محاولة واحدة من رصيد الكود.
            </p>
          </div>
        </div>
      </div>

      {/* Add new key */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2 text-lg font-black">
          <Plus className="w-5 h-5 text-primary" />
          إضافة كود تفعيل جديد
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_140px_auto] gap-3 items-end">
          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground">كود التفعيل</label>
            <input
              value={newKey}
              onChange={(e) => setNewKey(e.target.value.toUpperCase())}
              placeholder="مثال: HABWA-55"
              className="w-full h-12 px-4 rounded-xl border border-border bg-card text-lg font-bold tracking-wide focus:outline-none focus:border-primary focus:ring-4 focus:ring-accent transition-all"
              onKeyDown={(e) => e.key === "Enter" && handleAddKey()}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground">عدد المحاولات</label>
            <input
              type="number"
              min={1}
              max={9999}
              value={newKeyUses}
              onChange={(e) => setNewKeyUses(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full h-12 px-4 rounded-xl border border-border bg-card text-lg font-bold text-center focus:outline-none focus:border-primary focus:ring-4 focus:ring-accent transition-all"
            />
          </div>
          <button
            onClick={handleAddKey}
            disabled={isSaving}
            className="brand-gradient text-primary-foreground h-12 px-6 rounded-xl font-bold flex items-center gap-2 shadow hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50"
          >
            {isSaving ? (
              <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <Plus className="w-5 h-5" />
            )}
            إضافة
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          نصيحة: استخدم صيغة مميزة مثل HABWA-اسم_العميل. عدد المحاولات يحدد كم مرة يمكن بدء لعبة جديدة بهذا الكود.
        </p>
      </div>

      {/* Keys list */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-lg font-black">
            <Key className="w-5 h-5 text-primary" />
            أكواد التفعيل الحالية ({activationKeys.length})
          </div>
          {isLoading && (
            <div className="w-5 h-5 border-2 border-accent border-t-primary rounded-full animate-spin" />
          )}
        </div>

        {activationKeys.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted p-8 text-center text-muted-foreground">
            لا توجد أكواد تفعيل. أضف كوداً جديداً من الأعلى.
          </div>
        ) : (
          <div className="grid gap-2">
            {activationKeys.map((keyInfo) => (
              <motion.div
                key={keyInfo.key}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted hover:bg-card transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    keyInfo.remaining_uses <= 0 
                      ? "bg-muted-foreground/40"
                      : keyInfo.remaining_uses <= 3
                        ? "bg-warning"
                        : "bg-primary"
                  }`}>
                    <KeyRound className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <div className="font-bold text-lg tracking-wide text-foreground">{keyInfo.key}</div>
                    <div className="flex items-center gap-2 text-xs">
                      {keyInfo.remaining_uses <= 0 ? (
                        <span className="text-destructive font-bold">نفدت المحاولات</span>
                      ) : keyInfo.remaining_uses <= 3 ? (
                        <span className="text-warning font-bold">متبقي: {keyInfo.remaining_uses} محاولة</span>
                      ) : (
                        <span className="text-success font-bold">متبقي: {keyInfo.remaining_uses} محاولة</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyKey(keyInfo.key)}
                    className={`p-2.5 rounded-lg transition-all ${
                      copied === keyInfo.key
                        ? "bg-success/10 text-success"
                        : "bg-muted hover:bg-muted/70 text-muted-foreground"
                    }`}
                    title="نسخ الكود"
                  >
                    {copied === keyInfo.key ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDeleteKey(keyInfo.key)}
                    className="p-2.5 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive transition-all"
                    title="حذف الكود"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {activationKeys.length > 0 && (
          <div className="rounded-xl bg-accent border border-border p-4 text-xs text-primary">
            <div className="font-bold flex items-center gap-1.5 mb-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              ملاحظة مهمة:
            </div>
            <p>
              عند الض��ط على &quot;بدء لعبة جديدة&quot; تُخصم محاولة واحدة من رصيد الكود. إذا وصل الرصيد إلى 0، لن يتمكن المستخدم من بدء لعبة جديدة.
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "لوحة تحكم حبوة — إدارة الفئات والأسئلة" },
      { name: "description", content: "أضف الفئات والأسئلة، وأدر رموز التفعيل في لوحة تحكم لعبة حبوة." },
      { property: "og:title", content: "لوحة تحكم حبوة — إدارة الفئات والأسئلة" },
      { property: "og:description", content: "أضف الفئات والأسئلة، وأدر رموز التفعيل في لوحة تحكم لعبة حبوة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Admin,
});
