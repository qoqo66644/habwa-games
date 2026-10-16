import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Question } from "@/data/questions";
import type { DBGameSession } from "@/lib/habwa-db";
import { useContentStore } from "@/store/contentStore";
import { obfuscatedStorage } from "@/lib/obfuscatedStorage";
import { 
  getActivationKeyData,
  getActivationKeyDataForStart,
  startNewGameForKey,
  replayGameForKey,
  markQuestionUsedForKey, 
  useHelpTool as supabaseUseHelpTool 
} from "@/lib/habwa-db";

export type LifelineType = "friend" | "fifty" | "audience";
export type TeamColor = "green" | "orange";
export type GameStatus = "setup" | "playing" | "ended";

export interface LifelinesUsed {
  friend: boolean;
  fifty: boolean;
  audience: boolean;
}

export interface Team {
  name: string;
  score: number;
  color: TeamColor;
  lifelinesUsed: LifelinesUsed;
}

export type HelpToolType = "pit" | "call" | "twoAnswers";

export type StartGameResult =
  | { ok: true; remaining: number | null }
  | { ok: false; reason: "no_credit"; remaining: number }
  | { ok: false; reason: "missing_questions"; category: string; level?: number }
  | { ok: false; reason: "categories_count" }
  | { ok: false; reason: "invalid_key" }
  | { ok: false; reason: "error"; operation: string; message: string };

export interface HelpToolsUsed {
  pit: boolean;
  call: boolean;
  twoAnswers: boolean;
}

interface GameState {
  teams: [Team, Team];
  currentTeamIndex: 0 | 1;
  selectedCategories: string[];
  activeBoard: Record<string, Question[]>;
  usedTiles: string[];
  gameStatus: GameStatus;
  gameName: string;
  helpToolsUsed: HelpToolsUsed;
  pitModeActive: boolean;
  callTimerActive: boolean;
  callTimerSeconds: number;
  twoAnswersActive: boolean;
  // New: activation code tracking
  activeCode: string | null;
  isAdmin: boolean;
  usedQuestionIdsForCode: string[];
  currentGameId: string | null;
  replayCount: number;

  setTeamName: (idx: 0 | 1, name: string) => void;
  setGameName: (name: string) => void;
  setStartingTeam: (idx: 0 | 1) => void;
  toggleCategory: (name: string) => void;
  setSelectedCategories: (names: string[]) => void;
  startGame: () => Promise<StartGameResult>;
  replayGame: (session: DBGameSession) => Promise<boolean>;
  addScore: (teamIdx: 0 | 1, points: number) => void;
  adjustScore: (teamIdx: 0 | 1, delta: number) => void;
  switchTurn: () => void;
  useLifeline: (teamIdx: 0 | 1, type: LifelineType) => void;
  markTileUsed: (questionId: string) => void;
  endGame: () => void;
  resetGame: () => void;
  // Help tools
  activatePitMode: () => void;
  deactivatePitMode: () => void;
  startCallTimer: () => void;
  tickCallTimer: () => void;
  stopCallTimer: () => void;
  activateTwoAnswers: () => void;
  deactivateTwoAnswers: () => void;
  useHelpTool: (tool: HelpToolType) => void;
  resetHelpTools: () => void;
  // New: Code management
  setActiveCode: (code: string | null) => void;
  setIsAdmin: (isAdmin: boolean) => void;
  loadHelpToolsFromCode: () => Promise<void>;
  addScoreWithPit: (teamIdx: 0 | 1, points: number) => void;
  isQuestionUsedForCode: (questionId: string) => boolean;
}

const freshLifelines = (): LifelinesUsed => ({
  friend: false,
  fifty: false,
  audience: false,
});

const freshHelpTools = (): HelpToolsUsed => ({
  pit: false,
  call: false,
  twoAnswers: false,
});

const initialTeams = (): [Team, Team] => [
  { name: "الفريق الأخضر", score: 0, color: "green", lifelinesUsed: freshLifelines() },
  { name: "الفريق البرتقالي", score: 0, color: "orange", lifelinesUsed: freshLifelines() },
];

const drawForCategory = (
  category: { questions: Question[] },
  playedIds: Set<string>,
): Question[] => {
  const drawLevel = (level: 200 | 400 | 600) => {
    const fresh = category.questions.filter((q) => q.level === level && !playedIds.has(q.id));
    const pool = fresh.length >= 2 ? fresh : category.questions.filter((q) => q.level === level);
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 2);
  };
  const [a, b] = drawLevel(200);
  const [c, d] = drawLevel(400);
  const [e, f] = drawLevel(600);
  return [a, b, c, d, e, f].filter((q): q is Question => Boolean(q));
};

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      teams: initialTeams(),
      currentTeamIndex: 0,
      selectedCategories: [],
      activeBoard: {},
      usedTiles: [],
      gameStatus: "setup",
      gameName: "",
      helpToolsUsed: freshHelpTools(),
      pitModeActive: false,
      callTimerActive: false,
      callTimerSeconds: 60,
      twoAnswersActive: false,
      activeCode: null,
      isAdmin: false,
      usedQuestionIdsForCode: [],
      currentGameId: null,
      replayCount: 0,

      setTeamName: (idx, name) =>
        set((state) => {
          const teams: [Team, Team] = [state.teams[0], state.teams[1]];
          teams[idx] = { ...teams[idx], name };
          return { teams };
        }),

      setGameName: (name) => set({ gameName: name }),

      setStartingTeam: (idx) => set({ currentTeamIndex: idx }),

      toggleCategory: (name) =>
        set((state) => {
          const exists = state.selectedCategories.includes(name);
          if (exists) {
            return { selectedCategories: state.selectedCategories.filter((n) => n !== name) };
          }
          if (state.selectedCategories.length >= 6) return state;
          return { selectedCategories: [...state.selectedCategories, name] };
        }),

      setSelectedCategories: (names) => set({ selectedCategories: names.slice(0, 6) }),

      startGame: async () => {
        const { selectedCategories, teams, activeCode, isAdmin, usedQuestionIdsForCode, currentTeamIndex, gameName } = get();
        if (selectedCategories.length !== 6) {
          return { ok: false, reason: "categories_count" };
        }

        // 1) Credit check — always straight from the database, never local storage.
        let remaining: number | null = null;
        if (!isAdmin) {
          if (!activeCode) return { ok: false, reason: "invalid_key" };
          const creditResult = await getActivationKeyDataForStart(activeCode);
          if (!creditResult.ok) {
            if (creditResult.message === "INVALID_ACTIVATION_KEY") return { ok: false, reason: "invalid_key" };
            return { ok: false, reason: "error", operation: creditResult.operation, message: creditResult.message };
          }
          remaining = creditResult.data.remaining_uses ?? 0;
          if (remaining <= 0) return { ok: false, reason: "no_credit", remaining: 0 };
        }

        // 2) Question sufficiency check per selected category (2 per level).
        const { categories, playedQuestionIds } = useContentStore.getState();
        const playedSet = new Set([...playedQuestionIds, ...usedQuestionIdsForCode]);
        const activeBoard: Record<string, Question[]> = {};
        for (const name of selectedCategories) {
          const cat = categories.find((c) => c.name === name);
          if (!cat) return { ok: false, reason: "missing_questions", category: name };
          const missingLevel = ([200, 400, 600] as const).find(
            (level) => cat.questions.filter((q) => q.level === level).length < 2,
          );
          if (missingLevel) {
            return { ok: false, reason: "missing_questions", category: name, level: missingLevel };
          }
          activeBoard[name] = drawForCategory(cat, playedSet);
          if ((activeBoard[name]?.length ?? 0) < 6) {
            return { ok: false, reason: "missing_questions", category: name };
          }
        }

        // 3) Start the game — the database deducts exactly one use atomically.
        let currentGameId: string | null = null;
        if (activeCode && !isAdmin) {
          const result = await startNewGameForKey({
            key: activeCode, gameName, selectedCategories, activeBoard: activeBoard as any,
            teamNames: [teams[0].name, teams[1].name], startingTeamIndex: currentTeamIndex,
          });
          if (!result.ok) {
            if (result.code === "no_credit") return { ok: false, reason: "no_credit", remaining: 0 };
            if (result.code === "invalid_key") return { ok: false, reason: "invalid_key" };
            return {
              ok: false,
              reason: "error",
              operation: result.operation,
              message: result.message ?? "Unknown database error",
            };
          }
          currentGameId = result.gameId;
          remaining = result.remaining ?? (remaining !== null ? Math.max(0, remaining - 1) : null);
        }
        set({
          teams: [
            { ...teams[0], score: 0, lifelinesUsed: freshLifelines() },
            { ...teams[1], score: 0, lifelinesUsed: freshLifelines() },
          ],
          currentTeamIndex, activeBoard, usedTiles: [], gameStatus: "playing",
          helpToolsUsed: freshHelpTools(), pitModeActive: false, callTimerActive: false,
          callTimerSeconds: 60, twoAnswersActive: false, currentGameId, replayCount: 0,
        });
        return { ok: true, remaining };
      },

      replayGame: async (session) => {
        const { activeCode, isAdmin } = get();
        if (!isAdmin && (!activeCode || session.activation_key !== activeCode)) return false;
        if (!session.active_board || Object.keys(session.active_board).length === 0) return false;
        if (!isAdmin && activeCode && !(await replayGameForKey(activeCode, session.id))) return false;
        const board = session.active_board as unknown as Record<string, Question[]>;
        const names = session.team_names?.length === 2 ? session.team_names : ["الفريق الأول", "الفريق الثاني"];
        set({
          teams: [
            { name: names[0] ?? "الفريق الأول", score: 0, color: "green", lifelinesUsed: freshLifelines() },
            { name: names[1] ?? "الفريق الثاني", score: 0, color: "orange", lifelinesUsed: freshLifelines() },
          ],
          currentTeamIndex: session.starting_team_index, selectedCategories: session.selected_categories,
          activeBoard: board, usedTiles: [], gameStatus: "playing", gameName: session.game_name,
          helpToolsUsed: freshHelpTools(), pitModeActive: false, callTimerActive: false,
          callTimerSeconds: 60, twoAnswersActive: false, currentGameId: session.id,
          replayCount: session.replay_count + 1,
        });
        return true;
      },

      addScore: (teamIdx, points) =>
        set((state) => {
          const teams: [Team, Team] = [state.teams[0], state.teams[1]];
          teams[teamIdx] = { ...teams[teamIdx], score: teams[teamIdx].score + points };
          return { teams };
        }),

      adjustScore: (teamIdx, delta) =>
        set((state) => {
          const teams: [Team, Team] = [state.teams[0], state.teams[1]];
          teams[teamIdx] = {
            ...teams[teamIdx],
            score: Math.max(0, teams[teamIdx].score + delta),
          };
          return { teams };
        }),

      switchTurn: () =>
        set((state) => ({
          currentTeamIndex: state.currentTeamIndex === 0 ? 1 : 0,
        })),

      useLifeline: (teamIdx, type) =>
        set((state) => {
          const team = state.teams[teamIdx];
          if (team.lifelinesUsed[type]) return state;
          const teams: [Team, Team] = [state.teams[0], state.teams[1]];
          teams[teamIdx] = {
            ...team,
            lifelinesUsed: { ...team.lifelinesUsed, [type]: true },
          };
          return { teams };
        }),

      markTileUsed: (questionId) => {
        const { activeCode, isAdmin, usedQuestionIdsForCode } = get();
        
        // Mark question as used for this code in Supabase
        if (activeCode && !isAdmin) {
          markQuestionUsedForKey(activeCode, questionId);
        }
        
        set((state) => {
          if (state.usedTiles.includes(questionId)) return state;
          const usedTiles = [...state.usedTiles, questionId];
          const newUsedForCode = state.usedQuestionIdsForCode.includes(questionId) 
            ? state.usedQuestionIdsForCode 
            : [...state.usedQuestionIdsForCode, questionId];
          const totalTiles = state.selectedCategories.reduce(
            (sum, n) => sum + (state.activeBoard[n]?.length ?? 0),
            0,
          );
          const isOver = totalTiles > 0 && usedTiles.length >= totalTiles;
          return { 
            usedTiles, 
            usedQuestionIdsForCode: newUsedForCode,
            gameStatus: isOver ? "ended" : state.gameStatus 
          };
        });
      },

      endGame: () => set({ gameStatus: "ended" }),

      resetGame: () =>
        set({
          teams: initialTeams(),
          currentTeamIndex: 0,
          selectedCategories: [],
          activeBoard: {},
          usedTiles: [],
          gameStatus: "setup",
          gameName: "",
          helpToolsUsed: freshHelpTools(),
          pitModeActive: false,
          callTimerActive: false,
          callTimerSeconds: 60,
          twoAnswersActive: false,
          currentGameId: null,
          replayCount: 0,
        }),

      // New code management functions
      setActiveCode: (code) => set({ activeCode: code }),
      
      setIsAdmin: (isAdmin) => set({ isAdmin }),
      
      loadHelpToolsFromCode: async () => {
        const { activeCode, isAdmin } = get();
        if (isAdmin) {
          // Admin has unlimited help tools
          set({ helpToolsUsed: freshHelpTools(), usedQuestionIdsForCode: [] });
          return;
        }
        if (!activeCode) return;
        
        const keyData = await getActivationKeyData(activeCode);
        if (keyData) {
          set({
            helpToolsUsed: {
              pit: keyData.help_pit_used,
              call: keyData.help_call_used,
              twoAnswers: keyData.help_two_answers_used,
            },
            usedQuestionIdsForCode: keyData.used_question_ids || [],
          });
        }
      },
      
      addScoreWithPit: (teamIdx, points) => {
        const { pitModeActive, currentTeamIndex } = get();
        set((state) => {
          const teams: [Team, Team] = [state.teams[0], state.teams[1]];
          // Add points to scoring team
          teams[teamIdx] = { ...teams[teamIdx], score: teams[teamIdx].score + points };
          // If pit mode active, also deduct from opponent
          if (pitModeActive) {
            const opponent = teamIdx === 0 ? 1 : 0;
            teams[opponent] = { ...teams[opponent], score: Math.max(0, teams[opponent].score - points) };
          }
          return { teams, pitModeActive: false };
        });
      },
      
      isQuestionUsedForCode: (questionId) => {
        const { usedQuestionIdsForCode, isAdmin } = get();
        if (isAdmin) return false; // Admin can replay questions
        return usedQuestionIdsForCode.includes(questionId);
      },
      
      // Help tool implementations
      activatePitMode: () => {
        const { helpToolsUsed, activeCode, isAdmin } = get();
        if (helpToolsUsed.pit && !isAdmin) return;
        set({ pitModeActive: true });
        if (activeCode && !isAdmin) {
          supabaseUseHelpTool(activeCode, 'pit');
        }
        set((state) => ({
          helpToolsUsed: { ...state.helpToolsUsed, pit: true }
        }));
      },
      
      deactivatePitMode: () => set({ pitModeActive: false }),
      
      startCallTimer: () => {
        const { helpToolsUsed, activeCode, isAdmin } = get();
        if (helpToolsUsed.call && !isAdmin) return;
        set({ callTimerActive: true, callTimerSeconds: 60 });
        if (activeCode && !isAdmin) {
          supabaseUseHelpTool(activeCode, 'call');
        }
        set((state) => ({
          helpToolsUsed: { ...state.helpToolsUsed, call: true }
        }));
      },
      
      tickCallTimer: () => set((state) => ({ 
        callTimerSeconds: state.callTimerSeconds - 1 
      })),
      
      stopCallTimer: () => set({ callTimerActive: false }),
      
      activateTwoAnswers: () => {
        const { helpToolsUsed, activeCode, isAdmin } = get();
        if (helpToolsUsed.twoAnswers && !isAdmin) return;
        set({ twoAnswersActive: true });
        if (activeCode && !isAdmin) {
          supabaseUseHelpTool(activeCode, 'two_answers');
        }
        set((state) => ({
          helpToolsUsed: { ...state.helpToolsUsed, twoAnswers: true }
        }));
      },
      
      deactivateTwoAnswers: () => set({ twoAnswersActive: false }),
      
      useHelpTool: (tool) => {
        if (tool === 'pit') get().activatePitMode();
        else if (tool === 'call') get().startCallTimer();
        else if (tool === 'twoAnswers') get().activateTwoAnswers();
      },
      
      resetHelpTools: () => set({ 
        helpToolsUsed: freshHelpTools(),
        pitModeActive: false,
        callTimerActive: false,
        callTimerSeconds: 60,
        twoAnswersActive: false,
      }),
    }),
    {
      name: "habwa-game",
      version: 2,
      storage: createJSONStorage(() => obfuscatedStorage),
      partialize: (state) => ({
        teams: state.teams,
        currentTeamIndex: state.currentTeamIndex,
        selectedCategories: state.selectedCategories,
        activeBoard: state.activeBoard,
        usedTiles: state.usedTiles,
        gameStatus: state.gameStatus,
        gameName: state.gameName,
        activeCode: state.activeCode,
        isAdmin: state.isAdmin,
        usedQuestionIdsForCode: state.usedQuestionIdsForCode,
        currentGameId: state.currentGameId,
        replayCount: state.replayCount,
        helpToolsUsed: state.helpToolsUsed,
      }),
    },
  ),
);
