import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Sparkles,
  Users,
  Shuffle,
  ArrowLeft,
  Trophy,
  Gamepad2,
  Crown,
} from "lucide-react";
import { useGameStore } from "@/store/gameStore";
import confetti from "canvas-confetti";

const ACTIVATION_CODE_KEY = "habwa-activation-code";

function SetupPage() {
  const navigate = useNavigate();
  const { teams, setTeamName, setStartingTeam, setGameName, gameName } = useGameStore();
  
  const [localGameName, setLocalGameName] = useState(gameName || "");
  const [team1Name, setTeam1Name] = useState(teams[0].name || "الفريق الأخضر");
  const [team2Name, setTeam2Name] = useState(teams[1].name || "الفريق البرتقالي");
  const [drawResult, setDrawResult] = useState<0 | 1 | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    // Check if activated
    if (typeof window !== "undefined") {
      const activated = window.localStorage.getItem("habwa-activated");
      if (activated !== "1") {
        navigate({ to: "/activate", replace: true });
        return;
      }
    }
  }, [navigate]);

  const handleDraw = async () => {
    if (!team1Name.trim() || !team2Name.trim()) {
      toast.error("أدخل أسماء الفريقين أولاً");
      return;
    }

    setIsDrawing(true);
    setDrawResult(null);

    // Animate through both teams rapidly
    let iterations = 0;
    const maxIterations = 12;
    const interval = setInterval(() => {
      setDrawResult((prev) => (prev === 0 ? 1 : 0));
      iterations++;
      if (iterations >= maxIterations) {
        clearInterval(interval);
        // Final random selection
        const winner = Math.random() < 0.5 ? 0 : 1;
        setDrawResult(winner);
        setIsDrawing(false);
        
        // Celebration
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: winner === 0 ? ['#10B981', '#34D399', '#6EE7B7'] : ['#F97316', '#FB923C', '#FDBA74']
        });
        
        toast.success(`${winner === 0 ? team1Name : team2Name} يبدأ اللعب!`);
      }
    }, 100);
  };

  const handleContinue = () => {
    if (!team1Name.trim() || !team2Name.trim()) {
      toast.error("أدخل أسماء الفريقين");
      return;
    }

    // Save to store
    setTeamName(0, team1Name.trim());
    setTeamName(1, team2Name.trim());
    if (localGameName.trim()) {
      setGameName(localGameName.trim());
    }
    if (drawResult !== null) {
      setStartingTeam(drawResult);
    }

    navigate({ to: "/start-game", replace: false });
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen flex flex-col bg-background relative overflow-hidden"
    >
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -right-32 w-96 h-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-1/4 -left-32 w-96 h-96 rounded-full bg-primary-glow/20 blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4">
        <button
          onClick={() => navigate({ to: "/", replace: false })}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-bold">رجوع</span>
        </button>
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-warning" />
          <span className="font-black text-2xl text-foreground">حبوة</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg space-y-6"
        >
          {/* Title Card */}
          <div className="text-center space-y-2">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.1 }}
              className="w-16 h-16 mx-auto brand-gradient rounded-2xl flex items-center justify-center shadow-lg"
            >
              <Gamepad2 className="w-8 h-8 text-primary-foreground" />
            </motion.div>
            <h1 className="text-3xl font-black text-foreground">إعداد اللعبة</h1>
            <p className="text-muted-foreground">أدخل تفاصيل اللعبة والفرق المتنافسة</p>
          </div>

          {/* Form Card */}
          <div className="bg-card/10 backdrop-blur-xl rounded-3xl border border-border p-6 space-y-5">
            {/* Game Name */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-foreground font-bold">
                <Trophy className="w-4 h-4 text-warning" />
                اسم اللعبة (اختياري)
              </label>
              <input
                type="text"
                value={localGameName}
                onChange={(e) => setLocalGameName(e.target.value)}
                placeholder="مثال: الشقة، سهرة العائلة..."
                className="w-full h-14 px-5 rounded-2xl bg-card/10 border-2 border-border text-foreground text-lg font-bold placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:bg-card/15 transition-all"
              />
            </div>

            {/* Teams */}
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-foreground font-bold">
                <Users className="w-4 h-4 text-primary" />
                أسماء الفريقين
              </label>

              {/* Team 1 */}
              <div className="relative">
                <div className="absolute right-4 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-success" />
                <input
                  type="text"
                  value={team1Name}
                  onChange={(e) => setTeam1Name(e.target.value)}
                  placeholder="الفريق الأول"
                  className={`w-full h-14 px-5 pr-10 rounded-2xl border-2 text-lg font-bold placeholder:text-muted-foreground/50 focus:outline-none transition-all ${
                    drawResult === 0
                      ? "bg-success/30 border-success text-foreground"
                      : "bg-card/10 border-border text-foreground focus:border-success focus:bg-card/15"
                  }`}
                />
                {drawResult === 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute left-4 top-1/2 -translate-y-1/2"
                  >
                    <Crown className="w-6 h-6 text-warning" />
                  </motion.div>
                )}
              </div>

              {/* Team 2 */}
              <div className="relative">
                <div className="absolute right-4 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-accent" />
                <input
                  type="text"
                  value={team2Name}
                  onChange={(e) => setTeam2Name(e.target.value)}
                  placeholder="الفريق الثاني"
                  className={`w-full h-14 px-5 pr-10 rounded-2xl border-2 text-lg font-bold placeholder:text-muted-foreground/50 focus:outline-none transition-all ${
                    drawResult === 1
                      ? "bg-accent/60 border-accent-foreground text-foreground"
                      : "bg-card/10 border-border text-foreground focus:border-accent-foreground focus:bg-card/15"
                  }`}
                />
                {drawResult === 1 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute left-4 top-1/2 -translate-y-1/2"
                  >
                    <Crown className="w-6 h-6 text-warning" />
                  </motion.div>
                )}
              </div>
            </div>

            {/* Draw Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleDraw}
              disabled={isDrawing}
              className={`w-full h-14 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all ${
                isDrawing
                  ? "bg-primary/50 text-primary-foreground/70 cursor-wait"
                  : "brand-gradient hover:brightness-110 text-primary-foreground shadow-lg hover:shadow-xl"
              }`}
            >
              <Shuffle className={`w-5 h-5 ${isDrawing ? "animate-spin" : ""}`} />
              {isDrawing ? "جاري القرعة..." : "إجراء القرعة"}
            </motion.button>

            {/* Draw Result */}
            <AnimatePresence>
              {drawResult !== null && !isDrawing && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`p-4 rounded-2xl text-center font-bold ${
                    drawResult === 0
                      ? "bg-success/20 border border-success/30 text-success"
                      : "bg-accent/40 border border-accent-foreground/30 text-accent-foreground"
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Crown className="w-5 h-5 text-warning" />
                    <span>{drawResult === 0 ? team1Name : team2Name} يبدأ!</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Continue Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleContinue}
            className="w-full h-16 brand-gradient hover:brightness-110 text-primary-foreground rounded-2xl font-black text-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3"
          >
            <span>اختيار الفئات</span>
            <ArrowLeft className="w-6 h-6 rotate-180" />
          </motion.button>
        </motion.div>
      </main>
    </div>
  );
}

export const Route = createFileRoute("/setup")({
  head: () => ({
    meta: [
      { title: "إعداد اللعبة — حبوة" },
      { name: "description", content: "اختر أسماء الفرق والفئات قبل بدء جولة حبوة." },
      { property: "og:title", content: "إعداد اللعبة — حبوة" },
      { property: "og:description", content: "اختر أسماء الفرق والفئات قبل بدء جولة حبوة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SetupPage,
});
