import { useGameStore } from "@/store/gameStore";
import { useContentStore } from "@/store/contentStore";
import type { Question } from "@/data/questions";
import { CategoryVisual } from "@/lib/categoryIcon";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Check, ArrowLeftRight, Clock,
  Flag, Plus, Minus, Scissors, Video, ScanQrCode, Play,
  Shovel, PhoneCall, ListChecks, Maximize, Minimize,
  LayoutGrid, Pause, RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { HabwaLogo } from "@/components/habwa-logo";
import { qrImageUrl } from "@/lib/qr";
import { isWalaKelmaCategory } from "@/lib/category-rules";

/* ───────── helpers ───────── */
const isWalaKelma = isWalaKelmaCategory;
const getTimer = (cat: string, level: number) =>
  isWalaKelma(cat) ? (level === 200 ? 90 : 60) : 60;
const fmtClock = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
const sideTool = (active: boolean, used: boolean) =>
  `w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all
    ${active
      ? "bg-primary border-primary text-primary-foreground"
      : used
        ? "border-border-strong text-muted-foreground cursor-not-allowed"
        : "border-border text-muted-foreground hover:border-primary hover:text-primary"}`;


function youtubeEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    const id =
      u.hostname === "youtu.be"
        ? u.pathname.slice(1)
        : u.hostname.includes("youtube.com")
        ? u.searchParams.get("v")
        : null;
    return id ? `https://www.youtube.com/embed/${id}?autoplay=0&rel=0` : null;
  } catch { return null; }
}

/* ───────── types ───────── */
interface AQ extends Question { category: string; iconKey: string; }

/* ───────── tiny sub-components ───────── */
function VideoPlayer({ url }: { url: string }) {
  const embed = youtubeEmbed(url);
  if (embed) return (
    <div className="w-full aspect-video bg-overlay shrink-0">
      <iframe src={embed} className="w-full h-full" allowFullScreen title="v" />
    </div>
  );
  if (/\.(mp4|webm|ogg)/i.test(url)) return (
    <div className="w-full bg-overlay shrink-0">
      <video src={url} controls className="max-h-[28vh] w-full object-contain" />
    </div>
  );
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-2 px-3 py-2 text-info text-sm underline">
      <Video className="w-4 h-4 shrink-0" />{url}
    </a>
  );
}

/* ═══════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════ */
function Game() {
  const navigate = useNavigate();
  const {
    teams, currentTeamIndex, selectedCategories,
    usedTiles, activeBoard, gameStatus, gameName,
    addScore, adjustScore, switchTurn,
    useLifeline, markTileUsed, endGame,
    // Help tools
    helpToolsUsed, pitModeActive, callTimerActive, callTimerSeconds,
    twoAnswersActive, isAdmin,
    activatePitMode, deactivatePitMode,
    startCallTimer, tickCallTimer, stopCallTimer,
    activateTwoAnswers, deactivateTwoAnswers,
    addScoreWithPit, isQuestionUsedForCode,
  } = useGameStore();
  const { categories, markQuestionPlayed } = useContentStore();

  const [aq, setAq]                   = useState<AQ | null>(null);
  const [showAns, setShowAns]         = useState(false);
  const [timer, setTimer]             = useState(60);
  const [running, setRunning]         = useState(false);
  const [challengeGo, setChallengeGo] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [picking, setPicking]           = useState(false);
  const [qrReady, setQrReady]           = useState(false);


  // Fullscreen toggle (standard + WebKit prefix + iOS fallback)
  const toggleFullscreen = async () => {
    const d = document as any;
    const el = document.documentElement as any;
    const fsEl = d.fullscreenElement || d.webkitFullscreenElement;
    const canRequest = !!(el.requestFullscreen || el.webkitRequestFullscreen);
    try {
      if (fsEl) {
        if (d.exitFullscreen) await d.exitFullscreen();
        else if (d.webkitExitFullscreen) d.webkitExitFullscreen();
        setIsFullscreen(false);
        return;
      }
      if (canRequest && (d.fullscreenEnabled ?? d.webkitFullscreenEnabled ?? true)) {
        if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: "hide" });
        else el.webkitRequestFullscreen();
        setIsFullscreen(true);
        return;
      }
      throw new Error("unsupported");
    } catch {
      // iPhone Safari: Fullscreen API unsupported — best available fallback
      const standalone = (window.navigator as any).standalone === true ||
        window.matchMedia?.("(display-mode: standalone)").matches;
      if (standalone) {
        toast.success("اللعبة معروضة بملء الشاشة");
        return;
      }
      window.scrollTo(0, 1);
      setIsFullscreen(v => !v);
      toast.info("ملء الشاشة غير مدعوم في سفاري الآيفون", {
        description: "للعرض الكامل: اضغط زر المشاركة ⬆️ ثم «إضافة إلى الشاشة الرئيسية» وافتح حبوة من الأيقونة. أو دوّر الجهاز بالعرض.",
        duration: 7000,
      });
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleChange = () => {
      const d = document as any;
      setIsFullscreen(!!(d.fullscreenElement || d.webkitFullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleChange);
    document.addEventListener("webkitfullscreenchange", handleChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleChange);
      document.removeEventListener("webkitfullscreenchange", handleChange);
    };
  }, []);

  // Wait for saved game progress to load before deciding to leave the page
  const [hydrated, setHydrated] = useState(() => useGameStore.persist?.hasHydrated?.() ?? false);
  useEffect(() => {
    if (useGameStore.persist.hasHydrated()) setHydrated(true);
    return useGameStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (gameStatus === "ended") { navigate({ to: "/winner", replace: false }); return; }
    if (gameStatus !== "playing" || selectedCategories.length !== 6) navigate({ to: "/", replace: false });
  }, [hydrated, gameStatus, selectedCategories, navigate]);

  // Main question timer
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  // QR rounds: reveal the secret content to everyone when the time runs out
  useEffect(() => {
    if (!aq?.qrEnabled || !qrReady || showAns) return;
    if (timer <= 0) { setShowAns(true); setRunning(false); }
  }, [timer, aq, qrReady, showAns]);


  // Call timer (60 seconds for friend call)
  useEffect(() => {
    if (!callTimerActive) return;
    if (callTimerSeconds <= 0) {
      stopCallTimer();
      toast.info("انتهى وقت الاتصال!");
      return;
    }
    const id = setInterval(() => tickCallTimer(), 1000);
    return () => clearInterval(id);
  }, [callTimerActive, callTimerSeconds, stopCallTimer, tickCallTimer]);

  const board = useMemo(() => selectedCategories.map((name) => {
    const cat = categories.find((c) => c.name === name);
    const iconKey = cat?.iconUrl || cat?.iconKey || "Star";
    const qs: AQ[] = (activeBoard[name] ?? []).map((q) => ({ ...q, category: name, iconKey }));
    return { name, iconKey, qs };
  }), [selectedCategories, activeBoard, categories]);

  const openTile = (q: AQ) => {
    if (usedTiles.includes(q.id)) return;
    // Check if question was used for this code (unless admin)
    if (isQuestionUsedForCode(q.id)) {
      toast.error("هذا السؤال تم استخدامه سابقاً لهذا الكود");
      return;
    }
    const wk = isWalaKelma(q.category);
    setAq(q);
    setShowAns(false);
    setTimer(getTimer(q.category, q.level));
    setChallengeGo(!wk);
    setQrReady(false);
    setRunning(!wk && !q.qrEnabled);

    // Reset two answers mode when opening new question
    deactivateTwoAnswers();
  };

  const closeModal = () => { 
    setAq(null); setPicking(false); 
    setRunning(false); 
    setChallengeGo(false); 
    deactivateTwoAnswers();
  };

  const score = (action: "correct" | "wrong" | "other") => {
    if (!aq) return;
    if (action === "correct") {
      // Use pit mode if active (add to current, deduct from opponent)
      if (pitModeActive) {
        addScoreWithPit(currentTeamIndex, aq.level);
      } else {
        addScore(currentTeamIndex, aq.level);
      }
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.55 } });
    } else if (action === "other") {
      // Give to other team (with pit if active)
      const otherTeam = currentTeamIndex === 0 ? 1 : 0;
      if (pitModeActive) {
        addScoreWithPit(otherTeam, aq.level);
      } else {
        addScore(otherTeam, aq.level);
      }
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.55 } });
    }
    // Deactivate pit mode after scoring
    deactivatePitMode();
    markQuestionPlayed(aq.category, aq.id);
    markTileUsed(aq.id);
    switchTurn();
    closeModal();
  };

  const doLifeline = (ti: 0 | 1, type: "friend" | "fifty" | "audience") => {
    if (teams[ti].lifelinesUsed[type]) return;
    useLifeline(ti, type);
    toast.success(
      type === "friend" ? "اتصال بصديق!" :
      type === "fifty"  ? "50 : 50!" : "سؤال الجمهور!",
      { duration: 2800 }
    );
  };

  // Help tool handlers
  const handlePit = () => {
    if (helpToolsUsed.pit && !isAdmin) {
      toast.error("تم استخدام وسيلة الحفرة لهذا الكود");
      return;
    }
    activatePitMode();
    toast.success("وسيلة الحفرة مفعلة! إذا جاوب الفريق صح، ستُخصم النقاط من الخصم أيضاً", { duration: 4000 });
  };

  const handleCall = () => {
    if (helpToolsUsed.call && !isAdmin) {
      toast.error("تم استخدام وسيلة الاتصال لهذا الكود");
      return;
    }
    startCallTimer();
    toast.success("بدأ عداد الاتصال بصديق - 60 ثانية", { duration: 3000 });
  };

  const handleTwoAnswers = () => {
    if (helpToolsUsed.twoAnswers && !isAdmin) {
      toast.error("تم استخدام وسيلة الجوابين لهذا الكود");
      return;
    }
    activateTwoAnswers();
    toast.success("للفريق الحق في جوابين شفهياً", { duration: 3000 });
  };

  if (gameStatus !== "playing") return null;

  const wk = aq ? isWalaKelma(aq.category) : false;
  const timerOver = timer < 0;
  const timerWarn = timer >= 0 && timer <= 10;
  const timerLabel = timerOver ? `+${Math.abs(timer)}` : `${timer}`;

  return (
    <div dir="rtl" className="fixed inset-0 overflow-hidden flex flex-col bg-background"
      style={{ fontFamily: "'Cairo', system-ui, sans-serif", height: '100dvh' }}>

      {/* Header */}
      <header className="shrink-0 flex items-center justify-between gap-2 px-3 bg-surface"
        style={{ height: 46, minHeight: 46 }}>
        {/* Right: brand + turn */}
        <div className="flex items-center gap-2 min-w-0">
          <HabwaLogo className="w-7 h-7" />
          <span className="font-black text-primary text-sm leading-none shrink-0">حبوة</span>
          <div className="flex items-center gap-1 bg-primary text-primary-foreground
            px-3 py-1 rounded-full text-xs font-black shrink-0">
            <span className="text-primary-foreground/80">دور فريق :</span>
            <span className="truncate max-w-[80px]">{teams[currentTeamIndex].name}</span>
          </div>
        </div>

        {/* Center: game name */}
        <div className="flex-1 min-w-0 text-center">
          <span className="text-foreground font-bold text-sm truncate block">{gameName}</span>
        </div>

        {/* Left: actions */}
        <div className="flex items-center gap-2 shrink-0">
          {pitModeActive && (
            <div className="flex items-center gap-1 bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded-full text-[10px] font-bold animate-pulse">
              <Shovel className="w-2.5 h-2.5" />
              الحفرة
            </div>
          )}
          {callTimerActive && (
            <div className="flex items-center gap-1 bg-warning text-warning-foreground px-1.5 py-0.5 rounded-full text-[10px] font-bold">
              <PhoneCall className="w-2.5 h-2.5 animate-pulse" />
              {callTimerSeconds}ث
            </div>
          )}
          <button onClick={toggleFullscreen}
            className="flex items-center justify-center text-primary hover:text-foreground w-7 h-7 rounded-lg transition-colors"
            title={isFullscreen ? "إلغاء ملء الشاشة" : "ملء الشاشة"}>
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
          <button onClick={endGame}
            className="flex items-center gap-1 text-foreground/90 hover:text-foreground font-bold text-[11px] transition-colors">
            <Flag className="w-3.5 h-3.5 text-primary" />
            انتهاء اللعبة
          </button>
          <button onClick={() => navigate({ to: "/" })}
            className="flex items-center gap-1 text-foreground/90 hover:text-foreground font-bold text-[11px] transition-colors">
            <X className="w-3.5 h-3.5 text-primary" />
            الخروج
          </button>
        </div>
      </header>

      {/* Board */}
      <main className="flex-1 min-h-0 px-2 py-2 overflow-hidden">
        <div className="h-full w-full grid grid-cols-3 grid-rows-2 gap-x-4 gap-y-3">
          {board.map((col) => (
            <CategoryCard key={col.name} col={col} usedTiles={usedTiles} onTile={openTile} />
          ))}
        </div>
      </main>



      {/* Footer */}
      <footer className="shrink-0 bg-surface px-3"
        style={{ height: 96, minHeight: 96 }}>
        <div className="flex items-stretch justify-between gap-3 h-full max-w-full">

          {/* Team 1 (Right side in RTL) with their help tools */}
          <TeamPanel 
            team={teams[0]} 
            isActive={currentTeamIndex === 0}
            onAdjust={(d) => adjustScore(0, d)}
            helpToolsUsed={helpToolsUsed}
            isAdmin={isAdmin}
            onPit={handlePit}
            onCall={handleCall}
            onTwoAnswers={handleTwoAnswers}
            pitModeActive={pitModeActive}
            callTimerActive={callTimerActive}
            callTimerSeconds={callTimerSeconds}
            twoAnswersActive={twoAnswersActive}
          />
          
          {/* Center spacer */}
          <div className="flex-1" />

          
          {/* Team 2 (Left side in RTL) with their help tools */}
          <TeamPanel 
            team={teams[1]} 
            isActive={currentTeamIndex === 1}
            onAdjust={(d) => adjustScore(1, d)}
            helpToolsUsed={helpToolsUsed}
            isAdmin={isAdmin}
            onPit={handlePit}
            onCall={handleCall}
            onTwoAnswers={handleTwoAnswers}
            pitModeActive={pitModeActive}
            callTimerActive={callTimerActive}
            callTimerSeconds={callTimerSeconds}
            twoAnswersActive={twoAnswersActive}
          />
        </div>
      </footer>

      {/* Question / Answer full screen */}
      <AnimatePresence>
        {aq && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background flex flex-col"
            style={{ fontFamily: "'Cairo', system-ui, sans-serif", height: "100dvh" }}>

            {/* Header */}
            <header className="shrink-0 flex items-center justify-between gap-2 px-3 bg-surface"
              style={{ height: 46, minHeight: 46 }}>
              <div className="flex items-center gap-2 min-w-0">
                <HabwaLogo className="w-7 h-7" />
          <span className="font-black text-primary text-sm leading-none shrink-0">حبوة</span>
                <div className="flex items-center gap-1 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-black shrink-0">
                  <span className="text-primary-foreground/80">دور فريق :</span>
                  <span className="truncate max-w-[80px]">{teams[currentTeamIndex].name}</span>
                </div>
              </div>
              <div className="flex-1 min-w-0 text-center">
                <span className="text-foreground font-bold text-sm truncate block">{gameName}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {pitModeActive && (
                  <div className="flex items-center gap-1 bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded-full text-[10px] font-bold animate-pulse">
                    <Shovel className="w-2.5 h-2.5" /> الحفرة
                  </div>
                )}
                {callTimerActive && (
                  <div className="flex items-center gap-1 bg-warning text-warning-foreground px-1.5 py-0.5 rounded-full text-[10px] font-bold">
                    <PhoneCall className="w-2.5 h-2.5 animate-pulse" /> {callTimerSeconds}ث
                  </div>
                )}
                <button onClick={toggleFullscreen}
                  className="flex items-center justify-center text-primary hover:text-foreground w-7 h-7 rounded-lg transition-colors">
                  {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </button>
                <button onClick={endGame}
                  className="flex items-center gap-1 text-foreground/90 hover:text-foreground font-bold text-[11px] transition-colors">
                  <Flag className="w-3.5 h-3.5 text-primary" /> انتهاء اللعبة
                </button>
                <button onClick={closeModal}
                  className="flex items-center gap-1 text-foreground/90 hover:text-foreground font-bold text-[11px] transition-colors">
                  <LayoutGrid className="w-3.5 h-3.5 text-primary" /> الرجوع للوحة
                </button>
                <button onClick={() => navigate({ to: "/" })}
                  className="flex items-center gap-1 text-foreground/90 hover:text-foreground font-bold text-[11px] transition-colors">
                  <X className="w-3.5 h-3.5 text-primary" /> الخروج
                </button>
              </div>
            </header>

            {/* Body: frame + side teams */}
            <div className="flex-1 min-h-0 flex gap-2 px-3 pb-2">

              {/* Framed content */}
              <div className="flex-1 min-w-0 relative py-6">
                <div className="w-full h-full rounded-[26px] border-[3px] border-primary
                  flex flex-col items-center justify-start gap-3 px-6 py-5 pt-10 pb-16 overflow-y-auto">

                  {twoAnswersActive && !showAns && (
                    <span className="text-success font-bold text-xs">للفريق الحق في جوابين شفهياً</span>
                  )}

                  {!showAns ? (
                    <>
                      {aq.qrEnabled ? (
                        <div className="w-full max-w-md flex flex-col items-center gap-3">
                          <div className="text-center">
                            <div className="text-primary font-black text-lg sm:text-xl flex items-center justify-center gap-2"><ScanQrCode className="w-6 h-6" /> محتوى سري بالـ QR</div>
                          </div>
                          {!qrReady ? (
                            <>
                              {aq.qrToken ? (
                                <img
                                  src={qrImageUrl(aq.qrToken, 420)}
                                  alt="QR"
                                  className="w-[min(72vw,420px)] h-auto max-h-[48vh] aspect-square shrink-0 rounded-2xl bg-white p-3 shadow-xl object-contain"
                                />
                              ) : (
                                <div className="w-[min(72vw,420px)] aspect-square shrink-0 rounded-2xl bg-white/10 border border-border flex items-center justify-center text-muted-foreground font-bold text-sm">جاري تجهيز الباركود…</div>
                              )}
                              <ul className="w-full text-right text-sm sm:text-base font-bold text-foreground/90 space-y-1.5 bg-surface/60 rounded-2xl p-4 border border-border">
                                <li>• اختاروا شخصاً واحداً فقط ليمسح الباركود.</li>
                                <li>• هذا الشخص هو الوحيد المسموح له بتصوير الـ QR.</li>
                                <li>• بعد المسح سيظهر له المحتوى السري على جواله ليشرحه.</li>
                                <li>• لا يذكر الإجابة، فقط يشرح والفريق يخمّن.</li>
                              </ul>
                              <button onClick={() => { setQrReady(true); setRunning(true); }}
                                className="w-full sm:w-auto bg-primary text-primary-foreground font-black px-10 py-3 rounded-full flex items-center justify-center gap-2 shadow-lg">
                                <Play className="w-4 h-4 fill-current" /> جاهز
                              </button>
                            </>
                          ) : (
                            <div className="flex flex-col items-center gap-3 py-4">
                              <ScanQrCode className="w-16 h-16 text-primary/40" />
                              <p className="text-foreground font-black text-center text-base sm:text-lg leading-snug">
                                الجولة بدأت — الشرح جارٍ والفريق يخمّن
                              </p>
                              <p className="text-muted-foreground text-sm text-center">سيُكشف المحتوى للجميع عند انتهاء الوقت أو الجولة</p>
                              <button onClick={() => { setShowAns(true); setRunning(false); }}
                                className="bg-success text-success-foreground font-black px-8 py-2.5 rounded-full shadow-lg">
                                كشف المحتوى
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (

                        <>
                          {aq.question && (
                            <p className="text-foreground font-black text-center text-lg sm:text-xl md:text-2xl leading-snug whitespace-pre-line">
                              {aq.question}
                            </p>
                          )}
                          {aq.videoUrl ? (
                            <div className="w-full max-w-2xl"><VideoPlayer url={aq.videoUrl} /></div>
                          ) : aq.imageUrl ? (
                            <img src={aq.imageUrl} alt=""
                              className="max-h-[52vh] max-w-full object-contain rounded-md"
                              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                          ) : wk ? (
                            <ScanQrCode className="w-20 h-20 text-foreground/20" />
                          ) : null}
                        </>
                      )}
                      {wk && !aq.qrEnabled && !challengeGo && (
                        <button onClick={() => { setChallengeGo(true); setRunning(true); }}
                          className="bg-primary text-primary-foreground font-black px-8 py-2.5 rounded-full flex items-center gap-2">
                          <Play className="w-4 h-4 fill-current" /> بدء التحدي
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="text-foreground font-black text-center text-lg sm:text-xl md:text-2xl leading-snug whitespace-pre-line">
                        {aq.answer || "—"}
                      </p>
                      {aq.answerImageUrl && (
                        <img src={aq.answerImageUrl} alt=""
                          className="max-h-[52vh] max-w-full object-contain rounded-md"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                      )}
                      {aq.answerVideoUrl && <div className="w-full max-w-2xl"><VideoPlayer url={aq.answerVideoUrl} /></div>}
                      {pitModeActive && (
                        <span className="text-destructive font-bold text-xs flex items-center gap-1">
                          <Shovel className="w-3.5 h-3.5" /> الحفرة مفعلة: ستُخصم النقاط من الخصم أيضاً
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* Timer pill (top center) */}
                {!showAns && (!aq.qrEnabled || qrReady) && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 flex items-center gap-3
                    bg-surface text-foreground rounded-full px-5 py-2 shadow-lg">
                    <button onClick={() => setRunning((r) => !r)} className="text-foreground/90 hover:text-primary">
                      {running ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                    </button>
                    <span className={`font-black text-lg tabular-nums ${timerOver ? "text-destructive" : timerWarn ? "text-warning" : ""}`}>
                      {timerOver ? "+" : ""}{fmtClock(Math.abs(timer))}
                    </span>
                    <button onClick={() => setTimer(getTimer(aq.category, aq.level))} className="text-foreground/90 hover:text-primary">
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Points badge (top right) */}
                <div className="absolute top-0 right-6 bg-overlay text-foreground font-black text-base
                  rounded-xl px-5 py-2 shadow-lg">
                  {aq.level} نقطة
                </div>

                {/* Category pill (bottom right) */}
                <div className="absolute bottom-0 right-6 bg-primary text-primary-foreground font-black text-base
                  rounded-full px-6 py-2 shadow-lg max-w-[40%] truncate">
                  {aq.category}
                </div>

                {/* Primary action (bottom left) */}
                <div className="absolute bottom-0 left-6 flex items-end gap-2">
                  {!showAns && !aq.qrEnabled ? (
                    <button onClick={() => { setShowAns(true); setRunning(false); }}
                      className="bg-success hover:bg-success/90 text-success-foreground font-black text-base
                        rounded-full px-7 py-2 shadow-lg transition-colors">
                      الإجابة
                    </button>
                  ) : showAns ? (
                    <div className="relative">
                      {picking && (
                        <div className="absolute bottom-full mb-2 left-0 flex flex-col gap-1.5 bg-surface
                          rounded-2xl p-2 shadow-2xl border border-border min-w-[190px]">
                          <button onClick={() => { setPicking(false); score("correct"); }}
                            className="flex items-center gap-2 bg-success hover:bg-success/90 text-success-foreground font-black text-sm rounded-full px-4 py-2">
                            <Check className="w-4 h-4" /> {teams[currentTeamIndex].name}
                          </button>
                          <button onClick={() => { setPicking(false); score("other"); }}
                            className="flex items-center gap-2 bg-info hover:bg-info/80 text-info-foreground font-black text-sm rounded-full px-4 py-2">
                            <ArrowLeftRight className="w-4 h-4" /> {teams[currentTeamIndex === 0 ? 1 : 0].name}
                          </button>
                          <button onClick={() => { setPicking(false); score("wrong"); }}
                            className="flex items-center gap-2 bg-muted hover:bg-muted/70 text-foreground font-black text-sm rounded-full px-4 py-2">
                            <X className="w-4 h-4" /> لا أحد
                          </button>
                        </div>
                      )}
                      <button onClick={() => setPicking((p) => !p)}
                        className="bg-info hover:bg-info/80 text-info-foreground font-black text-base
                          rounded-full px-7 py-2 shadow-lg transition-colors">
                        أي فريق ؟
                      </button>
                    </div>
                  ) : null}
                </div>

                {/* Back to question (bottom, next to category) */}
                {showAns && (
                  <button onClick={() => { setShowAns(false); setPicking(false); }}
                    className="absolute bottom-0 right-[45%] flex items-center gap-2 bg-destructive hover:bg-destructive/90
                      text-destructive-foreground font-black text-base rounded-full px-6 py-2 shadow-lg transition-colors">
                    ارجع للسؤال
                  </button>
                )}
              </div>

              {/* Side team panels */}
              <div className="w-[190px] shrink-0 flex flex-col justify-center gap-5 py-4">
                {[0, 1].map((i) => {
                  const t = teams[i as 0 | 1];
                  return (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <div className={`w-full text-center rounded-full py-2 font-black text-primary-foreground text-base truncate px-3
                        ${currentTeamIndex === i ? "bg-primary" : "bg-primary/60"}`}>
                        {t.name}
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => adjustScore(i as 0 | 1, -100)}
                          className="w-6 h-6 rounded-full bg-muted text-foreground flex items-center justify-center">
                          <Minus className="w-3 h-3" strokeWidth={3} />
                        </button>
                        <span className="text-foreground font-black text-lg min-w-[40px] text-center">{t.score}</span>
                        <button onClick={() => adjustScore(i as 0 | 1, 100)}
                          className="w-6 h-6 rounded-full bg-muted text-foreground flex items-center justify-center">
                          <Plus className="w-3 h-3" strokeWidth={3} />
                        </button>
                      </div>
                      <span className="text-foreground font-black text-base">وسائل المساعدة</span>
                      <div className="flex items-center gap-2">
                        <button onClick={handleTwoAnswers} disabled={(helpToolsUsed.twoAnswers && !isAdmin) || twoAnswersActive}
                          className={sideTool(twoAnswersActive, helpToolsUsed.twoAnswers && !isAdmin)} title="جوابين">
                          <ArrowLeftRight className="w-4 h-4" />
                        </button>
                        <button onClick={handleCall} disabled={(helpToolsUsed.call && !isAdmin) || callTimerActive}
                          className={sideTool(callTimerActive, helpToolsUsed.call && !isAdmin)} title="اتصال بصديق">
                          <PhoneCall className="w-4 h-4" />
                        </button>
                        <button onClick={handlePit} disabled={(helpToolsUsed.pit && !isAdmin) || pitModeActive}
                          className={sideTool(pitModeActive, helpToolsUsed.pit && !isAdmin)} title="الحفرة">
                          <Shovel className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

/* ── Answer reveal + scoring ── */
function AnswerReveal({
  aq, teams, currentTeamIndex, onScore, pitModeActive,
}: {
  aq: AQ;
  teams: ReturnType<typeof useGameStore.getState>["teams"];
  currentTeamIndex: 0 | 1;
  onScore: (a: "correct" | "wrong" | "other") => void;
  pitModeActive: boolean;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className="space-y-3">
      {aq.answerImageUrl && (
        <img src={aq.answerImageUrl} alt=""
          className="max-h-[20vh] max-w-full mx-auto rounded-xl
            border border-success/30 object-contain bg-success/10"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
      )}
      {/* Answer box */}
      <div className="w-full text-center py-3 px-4 rounded-xl border-2 border-success
        bg-success/10 text-success font-black text-xl sm:text-2xl">
        {aq.answer || "—"}
      </div>
      {/* Pit mode indicator */}
      {pitModeActive && (
        <div className="text-center text-destructive font-bold text-sm bg-destructive/10 rounded-lg py-2 border border-destructive/30">
          <Shovel className="w-4 h-4 inline-block ml-1" />
          الحفرة مفعلة: ستُخصم النقاط من الخصم أيضاً!
        </div>
      )}
      {/* Scoring buttons */}
      <div className="flex flex-wrap gap-2 justify-center">
        <button onClick={() => onScore("correct")}
          className="flex-1 min-w-[130px] flex items-center justify-center gap-2
            bg-success hover:bg-success/90 text-success-foreground py-3 px-4
            rounded-xl font-black text-base transition-colors shadow">
          <Check className="w-5 h-5" />
          {teams[currentTeamIndex].name}
        </button>
        <button onClick={() => onScore("other")}
          className="flex-1 min-w-[130px] flex items-center justify-center gap-2
            bg-info hover:bg-info/80 text-info-foreground py-3 px-4
            rounded-xl font-black text-base transition-colors shadow">
          <ArrowLeftRight className="w-5 h-5" />
          الفريق الآخر
        </button>
        <button onClick={() => onScore("wrong")}
          className="flex-1 min-w-[100px] flex items-center justify-center gap-2
            bg-muted hover:bg-muted/70 text-muted-foreground py-3 px-4
            rounded-xl font-black text-base transition-colors shadow">
          <X className="w-5 h-5" /> لا أحد
        </button>
      </div>
    </motion.div>
  );
}

/* ── Category card (compact for landscape) ── */
function CategoryCard({
  col, usedTiles, onTile,
}: {
  col: { name: string; iconKey: string; qs: AQ[] };
  usedTiles: string[];
  onTile: (q: AQ) => void;
}) {
  const isImg = /^https?:\/\//i.test(col.iconKey);

  // Get questions by level (2 per level for left/right columns)
  const byLevel: Record<number, [AQ | undefined, AQ | undefined]> = {
    200: [col.qs.filter(q => q.level === 200)[0], col.qs.filter(q => q.level === 200)[1]],
    400: [col.qs.filter(q => q.level === 400)[0], col.qs.filter(q => q.level === 400)[1]],
    600: [col.qs.filter(q => q.level === 600)[0], col.qs.filter(q => q.level === 600)[1]],
  };

  const renderCol = (side: 0 | 1) => (
    <div className="flex flex-col justify-between gap-1.5 flex-1 min-w-0 h-full">
      {[200, 400, 600].map((pts) => {
        const q = side === 0 ? byLevel[pts]?.[0] : (byLevel[pts]?.[1] || byLevel[pts]?.[0]);
        const used = q ? usedTiles.includes(q.id) : true;
        return (
          <button
            key={`${side}-${pts}`}
            onClick={() => q && !used && onTile(q)}
            disabled={used}
            className={`flex-1 min-h-0 w-full rounded-full font-black text-base leading-none transition-all
              ${used
                ? "bg-muted text-transparent cursor-not-allowed"
                : "bg-muted hover:bg-muted/70 text-foreground cursor-pointer active:scale-95 shadow-inner"}`}
          >
            {!used && pts}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="flex items-stretch gap-2 h-full min-h-0">
      {renderCol(0)}

      {/* Center category card */}
      <div className="w-[26%] max-w-[190px] shrink-0 flex flex-col rounded-md overflow-hidden bg-accent">
        <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden">
          {isImg ? (
            <img src={col.iconKey} alt="" className="w-full h-full object-cover" />
          ) : (
            <CategoryVisual iconKey={col.iconKey} className="w-10 h-10 text-primary" />
          )}
        </div>
        <div className="h-[40px] shrink-0 bg-primary flex items-center justify-center px-1.5 py-1">
          <span className={`text-primary-foreground font-black leading-tight text-center whitespace-normal break-words max-w-full ${col.name.length > 18 ? "text-[9px] sm:text-[10px]" : "text-[10px] sm:text-xs"}`}>
            {col.name}
          </span>
        </div>
      </div>

      {renderCol(1)}
    </div>
  );
}


/* ── Team Panel (footer - very compact for landscape) ── */
function TeamPanel({
  team, isActive, onAdjust, helpToolsUsed, isAdmin, 
  onPit, onCall, onTwoAnswers,
  pitModeActive, callTimerActive, callTimerSeconds, twoAnswersActive,
}: {
  team: ReturnType<typeof useGameStore.getState>["teams"][number];
  isActive: boolean;
  onAdjust: (d: number) => void;
  helpToolsUsed: { pit: boolean; call: boolean; twoAnswers: boolean };
  isAdmin: boolean;
  onPit: () => void;
  onCall: () => void;
  onTwoAnswers: () => void;
  pitModeActive: boolean;
  callTimerActive: boolean;
  callTimerSeconds: number;
  twoAnswersActive: boolean;
}) {
  const toolBtn = (active: boolean, used: boolean) =>
    `w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all
      ${active
        ? "bg-primary border-primary text-primary-foreground"
        : used
          ? "border-border-strong text-muted-foreground cursor-not-allowed"
          : "border-border text-muted-foreground hover:border-primary hover:text-primary"}`;

  return (
    <div className="flex flex-col justify-center gap-2 w-[240px] shrink-0 h-full py-2">
      {/* Label + team name pill */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-foreground font-black text-base">وسائل المساعدة</span>
        <div className={`px-6 py-1.5 rounded-full font-black text-base text-primary-foreground truncate max-w-[130px] text-center
          ${isActive ? "bg-primary" : "bg-primary/60"}`}>
          {team.name}
        </div>
      </div>

      {/* Tools + score */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button onClick={onPit} disabled={(helpToolsUsed.pit && !isAdmin) || pitModeActive}
            className={toolBtn(pitModeActive, helpToolsUsed.pit && !isAdmin)} title="الحفرة">
            <Shovel className="w-4 h-4" />
          </button>
          <button onClick={onCall} disabled={(helpToolsUsed.call && !isAdmin) || callTimerActive}
            className={toolBtn(callTimerActive, helpToolsUsed.call && !isAdmin)} title="اتصال">
            <PhoneCall className="w-4 h-4" />
          </button>
          <button onClick={onTwoAnswers} disabled={(helpToolsUsed.twoAnswers && !isAdmin) || twoAnswersActive}
            className={toolBtn(twoAnswersActive, helpToolsUsed.twoAnswers && !isAdmin)} title="جوابين">
            <Scissors className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1 bg-background rounded-full px-1 py-1">
          <button onClick={() => onAdjust(100)}
            className="w-7 h-7 rounded-full bg-primary hover:brightness-110 text-primary-foreground flex items-center justify-center transition">
            <Plus className="w-3.5 h-3.5" strokeWidth={3} />
          </button>
          <span className="font-black text-lg text-foreground min-w-[46px] text-center">{team.score}</span>
          <button onClick={() => onAdjust(-100)}
            className="w-7 h-7 rounded-full bg-primary hover:brightness-110 text-primary-foreground flex items-center justify-center transition">
            <Minus className="w-3.5 h-3.5" strokeWidth={3} />
          </button>
        </div>
      </div>
    </div>
  );
}


export const Route = createFileRoute("/play")({
  head: () => ({
    meta: [
      { title: "لوحة اللعب — حبوة" },
      { name: "description", content: "لوحة اللعب المباشرة: اختر الأسئلة، سجّل النقاط، واستخدم وسائل المساعدة في حبوة." },
      { property: "og:title", content: "لوحة اللعب — حبوة" },
      { property: "og:description", content: "لوحة اللعب المباشرة: اختر الأسئلة، سجّل النقاط، واستخدم وسائل المساعدة في حبوة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Game,
});
