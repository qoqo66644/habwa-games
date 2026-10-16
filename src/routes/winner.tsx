import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useGameStore } from "@/store/gameStore";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy, RotateCcw, Home, Sparkles } from "lucide-react";
import confetti from "canvas-confetti";

function Winner() {
  const navigate = useNavigate();
  const { teams, gameStatus, resetGame } = useGameStore();

  useEffect(() => {
    if (gameStatus !== "ended") {
      navigate({ to: "/", replace: false });
      return;
    }

    // Trigger confetti on mount
    const duration = 3 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ["#F26522", "#FB923C", "#FDBA74", "#F5F5F5"], // confetti library requires literal hex
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ["#F26522", "#FB923C", "#FDBA74", "#F5F5F5"], // confetti library requires literal hex
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, [gameStatus, navigate]);

  if (gameStatus !== "ended") return null;

  const [team1, team2] = teams;
  const winner = team1.score > team2.score ? team1 : team2.score > team1.score ? team2 : null;
  const isTie = team1.score === team2.score;

  const handleNewGame = () => {
    resetGame();
    navigate({ to: "/start-game", replace: false });
  };

  const handleHome = () => {
    resetGame();
    navigate({ to: "/", replace: false });
  };

  return (
    <div dir="rtl" className="min-h-screen bg-background flex flex-col items-center justify-center p-6"
      style={{ fontFamily: "'Cairo', system-ui, sans-serif" }}>
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg space-y-8 text-center"
      >
        {/* Trophy */}
        <motion.div
          initial={{ rotate: -10 }}
          animate={{ rotate: [0, -5, 5, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          className="inline-flex items-center justify-center w-24 h-24 brand-gradient rounded-full shadow-xl"
        >
          <Trophy className="w-12 h-12 text-warning" />
        </motion.div>

        {/* Winner announcement */}
        <div className="space-y-2">
          {isTie ? (
            <>
              <h1 className="text-3xl font-black text-foreground">تعادل!</h1>
              <p className="text-lg text-muted-foreground font-bold">
                كلا الفريقين حصلا على {team1.score} نقطة
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center gap-2">
                <Sparkles className="w-6 h-6 text-warning" />
                <h1 className="text-3xl font-black text-foreground">مبروك!</h1>
                <Sparkles className="w-6 h-6 text-warning" />
              </div>
              <p className="text-2xl font-black text-primary">{winner?.name}</p>
              <p className="text-lg text-muted-foreground font-bold">
                الفائز بـ {winner?.score} نقطة
              </p>
            </>
          )}
        </div>

        {/* Scores */}
        <div className="grid grid-cols-2 gap-4">
          {[team1, team2].map((team, idx) => {
            const isWinner = !isTie && team === winner;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + idx * 0.1 }}
                className={`rounded-2xl border-2 p-5 transition-all ${
                  isWinner
                    ? "border-primary bg-accent shadow-lg"
                    : "border-border bg-card"
                }`}
              >
                <div className={`font-bold text-sm mb-1 ${isWinner ? "text-primary" : "text-muted-foreground"}`}>
                  {team.name}
                </div>
                <div className={`font-black text-4xl ${isWinner ? "text-primary" : "text-muted-foreground"}`}>
                  {team.score}
                </div>
                <div className="text-xs text-muted-foreground mt-1">نقطة</div>
                {isWinner && (
                  <div className="mt-2">
                    <Trophy className="w-5 h-5 text-warning mx-auto" />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <button
            onClick={handleNewGame}
            className="flex-1 brand-gradient text-primary-foreground py-4 rounded-2xl font-black text-lg
              shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all
              flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            لعبة جديدة
          </button>
          <button
            onClick={handleHome}
            className="flex-1 border-2 border-border bg-card text-primary
              hover:bg-accent py-4 rounded-2xl font-black text-lg
              transition-all flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5" />
            الرئيسية
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export const Route = createFileRoute("/winner")({
  head: () => ({
    meta: [
      { title: "نتيجة المباراة — حبوة" },
      { name: "description", content: "شاهد الفريق الفائز والنتيجة النهائية لجولة حبوة." },
      { property: "og:title", content: "نتيجة المباراة — حبوة" },
      { property: "og:description", content: "شاهد الفريق الفائز والنتيجة النهائية لجولة حبوة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Winner,
});
