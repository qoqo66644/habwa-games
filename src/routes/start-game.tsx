import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { CategoryVisual } from "@/lib/categoryIcon";
import { useContentStore } from "@/store/contentStore";
import { useGameStore } from "@/store/gameStore";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { 
  Play, CheckCircle2, Circle, Users, Sparkles, ArrowRight, 
  Shuffle, Crown, Gamepad2, Trophy
} from "lucide-react";
import confetti from "canvas-confetti";
import { HabwaLogo } from "@/components/habwa-logo";
import { fetchGameSessions, getActivationKeyData, type DBGameSession } from "@/lib/habwa-db";

type GamePhase = "categories" | "setup";

function StartGame() {
  const navigate = useNavigate();
  const { categories } = useContentStore();
  const {
    teams, selectedCategories, gameName,
    setTeamName, setGameName, toggleCategory, setSelectedCategories, 
    startGame, replayGame, setStartingTeam, loadHelpToolsFromCode, activeCode, isAdmin,
  } = useGameStore();

  const [phase, setPhase] = useState<GamePhase>("categories");
  const [drawResult, setDrawResult] = useState<0 | 1 | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [previousGames, setPreviousGames] = useState<DBGameSession[]>([]);
  const [remainingUses, setRemainingUses] = useState<number | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [starting, setStarting] = useState(false);

  // Load help tools state from code when component mounts
  useEffect(() => {
    loadHelpToolsFromCode();
    if (!activeCode && !isAdmin) {
      navigate({ to: "/activate", replace: true });
      return;
    }
    if (!activeCode || isAdmin) return;
    setLoadingHistory(true);
    Promise.all([fetchGameSessions(activeCode), getActivationKeyData(activeCode)])
      .then(([games, key]) => {
        setPreviousGames(games);
        setRemainingUses(key?.remaining_uses ?? 0);
      })
      .finally(() => setLoadingHistory(false));
  }, [activeCode, isAdmin, loadHelpToolsFromCode]);

  const handleContinueToSetup = () => {
    if (selectedCategories.length !== 6) {
      toast.error("اختر 6 فئات بالضبط للمتابعة");
      return;
    }
    setPhase("setup");
  };

  const handleDraw = () => {
    setIsDrawing(true);
    setDrawResult(null);
    
    // Animate draw
    let count = 0;
    const maxCount = 10;
    const interval = setInterval(() => {
      setDrawResult(Math.random() > 0.5 ? 0 : 1);
      count++;
      if (count >= maxCount) {
        clearInterval(interval);
        const winner = Math.random() > 0.5 ? 0 : 1;
        setDrawResult(winner);
        setStartingTeam(winner);
        setIsDrawing(false);
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        toast.success(`${teams[winner].name || (winner === 0 ? "الفريق الأول" : "الفريق الثاني")} يبدأ!`);
      }
    }, 100);
  };

  const handleStart = async () => {
    if (!teams[0].name.trim() || !teams[1].name.trim()) {
      toast.error("أدخل اسم كلا الفريقين");
      return;
    }
    setStarting(true);
    try {
      const result = await startGame();
      if (result.ok) {
        if (result.remaining !== null) setRemainingUses(result.remaining);
        navigate({ to: "/play", replace: false });
        return;
      }
      if (result.reason === "no_credit") {
        setRemainingUses(0);
        toast.error("انتهى رصيد الألعاب الجديدة. يمكنك إعادة ألعابك السابقة.");
      } else if (result.reason === "missing_questions") {
        toast.error(
          result.level
            ? `فئة "${result.category}" لا تحتوي على أسئلة كافية لمستوى ${result.level}`
            : `فئة "${result.category}" لا تحتوي على أسئلة كافية`,
        );
      } else if (result.reason === "categories_count") {
        toast.error("اختر 6 فئات بالضبط");
      } else if (result.reason === "invalid_key") {
        toast.error("رمز التفعيل غير صالح أو غير مفعّل");
      } else {
        const diagnostic = `${result.operation}: ${result.message}`;
        console.error(`[habwa] ${diagnostic}`);
        toast.error(import.meta.env.DEV ? diagnostic : "حدث خطأ أثناء بدء اللعبة، حاول مرة أخرى");
      }
    } finally {
      setStarting(false);
    }
  };

  const handleReplay = async (game: DBGameSession) => {
    setStarting(true);
    try {
      const ok = await replayGame(game);
      if (ok) navigate({ to: "/play", replace: false });
      else toast.error("تعذر إعادة اللعبة، حاول مرة أخرى");
    } finally {
      setStarting(false);
    }
  };

  const handleSelectFirst6 = () => {
    if (categories.length < 6) { toast.error("تحتاج إلى 6 فئات على الأقل"); return; }
    setSelectedCategories(categories.slice(0, 6).map((c) => c.name));
  };

  const remaining = 6 - selectedCategories.length;
  const ready = selectedCategories.length === 6;

  // Categories Selection Phase
  if (phase === "categories") {
    return (
      <div dir="rtl" className="min-h-screen h-screen overflow-hidden flex flex-col bg-background"
        style={{ fontFamily: "'Cairo', system-ui, sans-serif" }}>

        {/* Header */}
        <header className="brand-gradient shrink-0 flex items-center justify-between px-5 shadow-md"
          style={{ height: 52 }}>
          <button onClick={() => navigate({ to: "/", replace: false })}
            className="flex items-center gap-2 text-primary-foreground/80 hover:text-primary-foreground font-bold text-base transition-colors">
            <ArrowRight className="w-5 h-5" /> الرئيسية
          </button>
          <div className="flex items-center gap-2">
            <HabwaLogo className="w-9 h-9" />
            <span className="font-black text-xl text-primary-foreground">حبوة</span>
          </div>
        </header>

        {/* Body */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* Categories Panel */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-5 pb-32">
              <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                <div>
                  <h2 className="font-black text-xl text-foreground">اختر الفئات</h2>
                  <p className="text-sm text-muted-foreground font-bold">اضغط لاختيار / إلغاء فئة ({selectedCategories.length}/6)</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSelectFirst6}
                    className="btn-primary text-sm font-bold px-4 py-2 rounded-xl shadow">
                    اختيار أول 6
                  </button>
                  <button onClick={() => setSelectedCategories([])}
                    className="bg-card text-primary border-2 border-border
                      hover:bg-accent font-bold text-sm px-4 py-2 rounded-xl transition-colors">
                    إلغاء الكل
                  </button>
                </div>
              </div>

              {categories.length === 0 && (
                <div className="text-center text-muted-foreground py-16 text-lg font-bold">
                  لا توجد فئات — أضف فئات من لوحة الإدارة أولاً.
                </div>
              )}

              {!isAdmin && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 rounded-3xl border-2 border-border bg-card p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div>
                      <h3 className="font-black text-lg text-foreground">ألعابك السابقة</h3>
                      <p className="text-sm text-muted-foreground font-bold">تقدر تعيد أي لعبة لعبتها، بدون خصم من الرصيد</p>
                    </div>
                    <div className="rounded-2xl bg-accent px-4 py-2 text-center">
                      <div className="text-xs text-muted-foreground font-bold">الألعاب الجديدة المتبقية</div>
                      <div className="text-2xl font-black text-primary">{remainingUses ?? "—"}</div>
                    </div>
                  </div>
                  {loadingHistory ? (
                    <div className="text-sm font-bold text-muted-foreground py-4">جاري تحميل ألعابك...</div>
                  ) : previousGames.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border p-5 text-center text-sm font-bold text-muted-foreground">
                      ما لعبت أي لعبة حتى الآن. ابدأ لعبة جديدة وستظهر هنا للإعادة.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {previousGames.map((game) => (
                        <div key={game.id} className="rounded-2xl border border-border bg-background p-4 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-black text-foreground truncate">{game.game_name || "لعبة حبوة"}</div>
                            <div className="text-xs text-muted-foreground font-bold mt-1">لعبتها {game.replay_count + 1} مرة</div>
                          </div>
                          <button
                            onClick={() => handleReplay(game)}
                            disabled={starting}
                            className="shrink-0 rounded-xl bg-primary text-primary-foreground px-3 py-2 text-sm font-black hover:brightness-105 disabled:opacity-50"
                          >
                            إعادة اللعب
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                <AnimatePresence>
                  {categories.map((cat) => {
                    const selected = selectedCategories.includes(cat.name);
                    const disabled = !selected && selectedCategories.length >= 6;
                    return (
                      <motion.button
                        key={cat.id}
                        layout
                        whileHover={!disabled ? { scale: 1.03, y: -2 } : {}}
                        whileTap={!disabled ? { scale: 0.97 } : {}}
                        onClick={() => !disabled && toggleCategory(cat.name)}
                        className={`relative flex flex-col items-center gap-3 p-5
                          rounded-2xl border-2 text-center transition-all shadow-sm
                          ${selected
                            ? "border-primary bg-accent shadow-border shadow-md"
                            : disabled
                              ? "border-border bg-muted opacity-40 cursor-not-allowed"
                              : "border-border bg-card hover:border-primary hover:shadow-md cursor-pointer"}`}
                      >
                        <div className="absolute top-2 left-2">
                          {selected
                            ? <CheckCircle2 className="w-5 h-5 text-primary" />
                            : <Circle className="w-5 h-5 text-muted-foreground" />}
                        </div>
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center
                          text-primary-foreground shadow-md transition-all
                          ${selected ? "brand-gradient" : "bg-accent"}`}>
                          <CategoryVisual iconKey={cat.iconKey} iconUrl={cat.iconUrl}
                            className={`w-8 h-8 ${selected ? "" : "text-primary"}`} />
                        </div>
                        <div className="space-y-0.5 w-full">
                          <div className="font-black text-base text-foreground leading-tight">{cat.name}</div>
                          <div className="text-sm text-muted-foreground font-bold">{cat.questions.length} سؤال</div>
                        </div>
                      </motion.button>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>

            {/* Fixed continue button */}
            <div className="fixed bottom-0 left-0 right-0
              bg-card border-t border-border
              p-4 shadow-lg z-30">
              <button
                onClick={handleContinueToSetup}
                disabled={!ready}
                className={`w-full h-16 rounded-2xl font-black text-2xl shadow-lg
                  flex items-center justify-center gap-3 transition-all
                  ${ready
                    ? "brand-gradient text-primary-foreground hover:shadow-xl hover:scale-[1.01] active:scale-[0.99]"
                    : "bg-muted text-muted-foreground cursor-not-allowed"}`}
              >
                {ready
                  ? <>متابعة <ArrowRight className="w-6 h-6 rotate-180" /></>
                  : `اختر ${remaining} فئة ${remaining === 1 ? "أخرى" : "أخريات"}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Setup Phase (Team names, Game name, Draw)
  return (
    <div dir="rtl" className="min-h-screen h-screen overflow-hidden flex flex-col bg-background"
      style={{ fontFamily: "'Cairo', system-ui, sans-serif" }}>

      {/* Header */}
      <header className="brand-gradient shrink-0 flex items-center justify-between px-5 shadow-md"
        style={{ height: 52 }}>
        <button onClick={() => setPhase("categories")}
          className="flex items-center gap-2 text-primary-foreground/80 hover:text-primary-foreground font-bold text-base transition-colors">
          <ArrowRight className="w-5 h-5" /> تعديل الفئات
        </button>
        <div className="flex items-center gap-2">
          <HabwaLogo className="w-9 h-9" />
          <span className="font-black text-xl text-primary-foreground">حبوة</span>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-y-auto p-5 pb-32">
        <div className="max-w-xl mx-auto space-y-6">
          
          {/* Game Name */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl border-2 border-border p-6 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 brand-gradient rounded-xl flex items-center justify-center shadow">
                <Gamepad2 className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h2 className="font-black text-xl text-foreground">اسم اللعبة</h2>
                <p className="text-sm text-muted-foreground font-bold">اختياري - مثال: الشقة</p>
              </div>
            </div>
            <input
              type="text"
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
              placeholder="أدخل اسم اللعبة..."
              className="w-full h-14 px-4 rounded-2xl border-2 border-border
                bg-background text-lg font-bold text-foreground focus:outline-none
                focus:border-primary focus:bg-card focus:ring-4
                focus:ring-primary/10 transition-all text-center"
            />
          </motion.div>

          {/* Teams */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card rounded-2xl border-2 border-border p-6 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 brand-gradient rounded-xl flex items-center justify-center shadow">
                <Users className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h2 className="font-black text-xl text-foreground">الفرق المتنافسة</h2>
                <p className="text-sm text-muted-foreground font-bold">أدخل اسم كل فريق</p>
              </div>
            </div>

            <div className="space-y-4">
              {([0, 1] as const).map((idx) => (
                <div key={idx} className="space-y-1.5">
                  <label className="block text-base font-black text-primary">
                    {idx === 0 ? "الفريق الأول" : "الفريق الثاني"}
                  </label>
                  <input
                    type="text"
                    value={teams[idx].name}
                    onChange={(e) => setTeamName(idx, e.target.value)}
                    placeholder={idx === 0 ? "الفريق الأخضر" : "الفريق البرتقالي"}
                    className={`w-full h-14 px-4 rounded-2xl border-2
                      bg-background text-lg font-bold text-foreground focus:outline-none
                      focus:bg-card focus:ring-4 transition-all
                      ${drawResult === idx 
                        ? "border-success bg-success/10 focus:border-success focus:ring-success/10" 
                        : "border-border focus:border-primary focus:ring-primary/10"}`}
                  />
                </div>
              ))}
            </div>
          </motion.div>

          {/* Draw */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card rounded-2xl border-2 border-border p-6 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 brand-gradient rounded-xl flex items-center justify-center shadow">
                <Trophy className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h2 className="font-black text-xl text-foreground">القرعة</h2>
                <p className="text-sm text-muted-foreground font-bold">اختر من يبدأ اللعبة</p>
              </div>
            </div>

            <div className="text-center space-y-4">
              {drawResult !== null && !isDrawing && (
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-success/10 border-2 border-success rounded-2xl p-4"
                >
                  <div className="flex items-center justify-center gap-2 text-success">
                    <Crown className="w-6 h-6 text-warning" />
                    <span className="font-black text-xl">
                      {teams[drawResult].name || (drawResult === 0 ? "الفريق الأول" : "الفريق الثاني")}
                    </span>
                    <span className="font-bold text-success">يبدأ!</span>
                  </div>
                </motion.div>
              )}

              {isDrawing && (
                <div className="bg-accent border-2 border-border rounded-2xl p-4">
                  <div className="font-black text-xl text-primary animate-pulse">
                    {drawResult !== null 
                      ? (teams[drawResult].name || (drawResult === 0 ? "الفريق الأول" : "الفريق الثاني"))
                      : "جاري السحب..."}
                  </div>
                </div>
              )}

              <button
                onClick={handleDraw}
                disabled={isDrawing}
                className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground
                  rounded-2xl font-black text-lg shadow-lg
                  flex items-center justify-center gap-3 transition-all
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Shuffle className={`w-5 h-5 ${isDrawing ? "animate-spin" : ""}`} />
                {drawResult !== null && !isDrawing ? "إعادة القرعة" : "إجراء القرعة"}
              </button>
            </div>
          </motion.div>

          {/* Selected Categories Summary */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-accent rounded-2xl border-2 border-border p-4"
          >
            <div className="text-sm font-bold text-primary mb-2">الفئات المختارة:</div>
            <div className="flex flex-wrap gap-2">
              {selectedCategories.map((name) => (
                <span key={name} className="text-xs bg-card border border-border
                  rounded-full px-3 py-1 font-bold text-primary shadow-sm">
                  {name}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Fixed start button */}
      <div className="fixed bottom-0 left-0 right-0
        bg-card border-t border-border
        p-4 shadow-lg z-30">
        <button
          onClick={handleStart}
          disabled={starting || !teams[0].name.trim() || !teams[1].name.trim() || (!isAdmin && remainingUses !== null && remainingUses <= 0)}
          className={`w-full h-16 rounded-2xl font-black text-2xl shadow-lg
            flex items-center justify-center gap-3 transition-all
            ${teams[0].name.trim() && teams[1].name.trim()
              ? "brand-gradient text-primary-foreground hover:shadow-xl hover:scale-[1.01] active:scale-[0.99]"
              : "bg-muted text-muted-foreground cursor-not-allowed"}`}
        >
          <Play className="w-7 h-7 fill-primary-foreground" />
          {starting ? "جاري البدء..." : !isAdmin && remainingUses !== null && remainingUses <= 0 ? "لا توجد ألعاب جديدة" : "ابدأ لعبة جديدة"}
        </button>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/start-game")({
  head: () => ({
    meta: [
      { title: "بدء لعبة جديدة — حبوة" },
      { name: "description", content: "حدد الفرق والفئات الست وابدأ جولة جديدة من حبوة." },
      { property: "og:title", content: "بدء لعبة جديدة — حبوة" },
      { property: "og:description", content: "حدد الفرق والفئات الست وابدأ جولة جديدة من حبوة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StartGame,
});
