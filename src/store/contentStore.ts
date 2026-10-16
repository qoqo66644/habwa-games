import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Category, Difficulty, Question } from "@/data/questions";
import { obfuscatedStorage } from "@/lib/obfuscatedStorage";
import { isWalaKelmaCategory } from "@/lib/category-rules";
import {
  fetchCategories,
  fetchActivationKeys,
  fetchPlayedQuestions,
  upsertCategory as supabaseUpsertCategory,
  deleteCategory as supabaseDeleteCategory,
  upsertQuestion as supabaseUpsertQuestion,
  deleteQuestion as supabaseDeleteQuestion,
  addActivationKey as supabaseAddActivationKey,
  removeActivationKey as supabaseRemoveActivationKey,
  validateActivationKey as supabaseValidateActivationKey,
  markQuestionAsPlayed as supabaseMarkQuestionAsPlayed,
  resetPlayedQuestions as supabaseResetPlayedQuestions,
  syncAllCategories,
} from "@/lib/habwa-db";

// Default activation keys - fallback if Supabase fails
const defaultActivationKeys: string[] = [
  "HABWA-2024",
  "HABWA-PREMIUM",
  "HABWA-DEMO",
];

const baseCategories: Category[] = [
  {
    id: "football",
    name: "كرة قدم",
    iconKey: "Trophy",
    questions: [
      { id: "fb1", level: 200, question: "كم عدد لاعبي فريق كرة القدم داخل الملعب؟", answer: "11 لاعباً" },
      { id: "fb2", level: 200, question: "ما هو النادي الأكثر فوزاً بدوري أبطال أوروبا؟", answer: "ريال مدريد" },
      { id: "fb3", level: 400, question: "من هو الهداف التاريخي لكأس العالم؟", answer: "ميروسلاف كلوزه" },
      { id: "fb4", level: 400, question: "في أي عام فاز المنتخب الأرجنتيني بكأس العالم 2022؟", answer: "2022" },
      { id: "fb5", level: 600, question: "كم مرة فاز كريستيانو رونالدو بالكرة الذهبية؟", answer: "5 مرات" },
      { id: "fb6", level: 600, question: "ما هو المنتخب العربي الوحيد الذي وصل لنصف نهائي كأس العالم؟", answer: "المنتخب المغربي" },
    ],
  },
  {
    id: "history",
    name: "تاريخ",
    iconKey: "Scroll",
    questions: [
      { id: "h1", level: 200, question: "في أي عام تأسست المملكة العربية السعودية؟", answer: "1932" },
      { id: "h2", level: 200, question: "من هو فاتح القسطنطينية؟", answer: "السلطان محمد الفاتح" },
      { id: "h3", level: 400, question: "في أي معركة انتصر المسلمون على الفرس بقيادة سعد بن أبي وقاص؟", answer: "معركة القادسية" },
      { id: "h4", level: 400, question: "من هو مؤسس الدولة الأموية؟", answer: "معاوية بن أبي سفيان" },
      { id: "h5", level: 600, question: "في أي عام سقطت الأندلس بسقوط مدينة غرناطة؟", answer: "1492" },
      { id: "h6", level: 600, question: "من هو القائد الذي قاد المسلمين في معركة حطين؟", answer: "صلاح الدين الأيوبي" },
    ],
  },
  {
    id: "geography",
    name: "جغرافيا",
    iconKey: "Globe",
    questions: [
      { id: "g1", level: 200, question: "ما هي عاصمة المغرب؟", answer: "الرباط" },
      { id: "g2", level: 200, question: "ما هو أطول نهر في العالم؟", answer: "نهر النيل" },
      { id: "g3", level: 400, question: "ما هي أكبر صحراء في العالم؟", answer: "الصحراء الكبرى" },
      { id: "g4", level: 400, question: "في أي قارة تقع دولة البرازيل؟", answer: "أمريكا الجنوبية" },
      { id: "g5", level: 600, question: "ما هي أعلى قمة جبلية في الوطن العربي؟", answer: "جبل توبقال" },
      { id: "g6", level: 600, question: "كم عدد الدول الأعضاء في جامعة الدول العربية؟", answer: "22 دولة" },
    ],
  },
  {
    id: "science",
    name: "علوم",
    iconKey: "FlaskConical",
    questions: [
      { id: "s1", level: 200, question: "ما هو الكوكب الأقرب إلى الشمس؟", answer: "عطارد" },
      { id: "s2", level: 200, question: "كم عدد عظام جسم الإنسان البالغ؟", answer: "206 عظمة" },
      { id: "s3", level: 400, question: "ما هو الرمز الكيميائي للذهب؟", answer: "Au" },
      { id: "s4", level: 400, question: "ما هي أكبر خلية في جسم الإنسان؟", answer: "البويضة" },
      { id: "s5", level: 600, question: "من هو العالم الذي اكتشف قانون الجاذبية؟", answer: "إسحاق نيوتن" },
      { id: "s6", level: 600, question: "ما هي سرعة الضوء في الفراغ تقريباً؟", answer: "300,000 كم/ث" },
    ],
  },
  {
    id: "sports",
    name: "رياضة",
    iconKey: "Trophy",
    questions: [
      { id: "sp1", level: 200, question: "كم عدد لاعبي فريق كرة القدم في الملعب؟", answer: "11 لاعباً" },
      { id: "sp2", level: 200, question: "أين أقيمت أول بطولة لكأس العالم؟", answer: "الأوروغواي" },
      { id: "sp3", level: 400, question: "ما هو المنتخب العربي الذي تأهل لنصف نهائي كأس العالم 2022؟", answer: "المنتخب المغربي" },
      { id: "sp4", level: 400, question: "كم مرة فاز نادي ريال مدريد بدوري أبطال أوروبا؟", answer: "15 مرة" },
      { id: "sp5", level: 600, question: "من هو هداف كأس العالم 2022؟", answer: "كيليان مبابي" },
      { id: "sp6", level: 600, question: "في أي عام استضافت قطر بطولة كأس العالم؟", answer: "2022" },
    ],
  },
  {
    id: "literature",
    name: "أدب ولغة",
    iconKey: "BookOpen",
    questions: [
      { id: "l1", level: 200, question: "من هو شاعر النيل؟", answer: "حافظ إبراهيم" },
      { id: "l2", level: 200, question: "كم عدد حروف اللغة العربية؟", answer: "28 حرفاً" },
      { id: "l3", level: 400, question: "من مؤلف رواية موسم الهجرة إلى الشمال؟", answer: "الطيب صالح" },
      { id: "l4", level: 400, question: "من هو أمير الشعراء؟", answer: "أحمد شوقي" },
      { id: "l5", level: 600, question: "من هو أول روائي عربي حصل على جائزة نوبل في الأدب؟", answer: "نجيب محفوظ" },
      { id: "l6", level: 600, question: "ما اسم القصيدة الأشهر للشاعر المتنبي التي مطلعها (واحر قلباه)؟", answer: "قصيدة كافور الإخشيدي" },
    ],
  },
  {
    id: "general",
    name: "ثقافة عامة",
    iconKey: "Lightbulb",
    questions: [
      { id: "gn1", level: 200, question: "ما هي أكبر دولة عربية من حيث المساحة؟", answer: "الجزائر" },
      { id: "gn2", level: 200, question: "ما هي عملة اليابان؟", answer: "الين" },
      { id: "gn3", level: 400, question: "في أي مدينة يقع برج إيفل؟", answer: "باريس" },
      { id: "gn4", level: 400, question: "ما اسم أكبر محيط في العالم؟", answer: "المح����ط الهادئ" },
      { id: "gn5", level: 600, question: "من اخترع المصباح الكهربائي؟", answer: "توماس إديسون" },
      { id: "gn6", level: 600, question: "ما هي أصغر دولة في العالم من حيث المساحة؟", answer: "الفاتيكان" },
    ],
  },
  {
    id: "wala-kelma",
    name: "ولا كلمة",
    iconKey: "MessageSquareOff",
    questions: [
      {
        id: "wk1", level: 200,
        question: "وصف: رياضي\nالكلمات المحظورة: ركض، سباق، بدو، مضمار\nالكلمة المطلوبة: ماراثون",
        answer: "ماراثون",
      },
      {
        id: "wk2", level: 200,
        question: "وصف: رياضي\nالكلمات المحظورة: وزن، حديد، جيم، تمرين\nالكلمة المطلوبة: رفع الأثقال",
        answer: "رفع الأثقال",
      },
      {
        id: "wk3", level: 200,
        question: "وصف: عامة\nالكلمات المحظورة: سماء، ضوء، شمس، حرارة\nالكلمة المطلوبة: قوس قزح",
        answer: "قوس قزح",
      },
      {
        id: "wk4", level: 200,
        question: "وصف: عامة\nالكلمات المحظورة: طعام، خبز، أكل، مطعم\nالكلمة المطلوبة: مطبخ",
        answer: "مطبخ",
      },
      {
        id: "wk5", level: 400,
        question: "وصف: رياضي\nالكلمات المحظورة: كرة، ملعب، هدف، حارس\nالكلمة المطلوبة: ركلة الجزاء",
        answer: "ركلة الجزاء",
      },
      {
        id: "wk6", level: 400,
        question: "وصف: رياضي\nالكلمات المحظورة: ماء، سباحة، بحر، حوض\nالكلمة المطلوبة: الفراشة",
        answer: "الفراشة (أسلوب سباحة)",
      },
      {
        id: "wk7", level: 400,
        question: "وصف: عامة\nالكلمات المحظورة: شاشة، اتصال، إنترنت، تطبيق\nالكلمة المطلوبة: شبكة التواصل الاجتماعي",
        answer: "شبكة التواصل الاجتماعي",
      },
      {
        id: "wk8", level: 400,
        question: "وصف: عامة\nالكلمات المحظورة: فيلم، ممثل، مشهد، كاميرا\nالكلمة المطلوبة: المخرج",
        answer: "المخرج",
      },
      {
        id: "wk9", level: 600,
        question: "وصف: رياضي\nالكلمات المحظورة: قتال، حلبة، لكمة، بطولة\nالكلمة المطلوبة: الملاكمة التايلاندية",
        answer: "الملاكمة التايلاندية (موي تاي)",
      },
      {
        id: "wk10", level: 600,
        question: "وصف: رياضي\nالكلمات المحظورة: جبل، ثلج، انزلاق، منحدر\nالكلمة المطلوبة: التزلج الألبي",
        answer: "التزلج الألبي",
      },
      {
        id: "wk11", level: 600,
        question: "وصف: عامة\nالكلمات المحظورة: جين، وراثة، خلية، حمض\nالكلمة المطلوبة: الحمض النووي",
        answer: "الحمض النووي (DNA)",
      },
      {
        id: "wk12", level: 600,
        question: "وصف: عامة\nالكلمات المحظورة: حكومة، انتخاب، رئيس، سلطة\nالكلمة المطلوبة: الديمقراطية البرلمانية",
        answer: "الديمقراطية البرلمانية",
      },
    ],
  },
];

function deduplicateQuestions(questions: Question[]): Question[] {
  const seen = new Set<string>();
  return questions.filter((q) => {
    const key = `${q.question.trim().toLowerCase()}||${q.answer.trim().toLowerCase()}`;
    if (seen.has(q.id) || seen.has(key)) return false;
    seen.add(q.id);
    seen.add(key);
    return true;
  });
}

function mergeCategories(stored: Category[], base: Category[]): Category[] {
  const storedMap = new Map(stored.map((c) => [c.id, c]));
  const result: Category[] = stored.map((c) => ({
    ...c,
    questions: deduplicateQuestions(c.questions),
  }));
  for (const baseCat of base) {
    if (!storedMap.has(baseCat.id)) {
      result.push(baseCat);
    }
  }
  return result;
}

const uid = (prefix = "id") =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

export interface NewQuestionInput {
  level: Difficulty;
  question: string;
  answer: string;
  imageUrl?: string | undefined;
  answerImageUrl?: string | undefined;
  videoUrl?: string;
  answerVideoUrl?: string;
  qrEnabled?: boolean;
}

export interface NewCategoryInput {
  name: string;
  iconKey: string;
  iconUrl?: string | undefined;
}

// License/Activation Keys Store - Now with Supabase sync and remaining_uses
export interface ActivationKeyInfo {
  key: string;
  remaining_uses: number;
  is_active: boolean;
}

interface LicenseState {
  activationKeys: ActivationKeyInfo[];
  isLoading: boolean;
  lastFetched: number | null;
  addActivationKey: (key: string, remainingUses?: number) => Promise<boolean>;
  removeActivationKey: (key: string) => Promise<void>;
  validateKey: (key: string) => Promise<ActivationKeyInfo | null>;
  getKeys: () => ActivationKeyInfo[];
  fetchFromCloud: () => Promise<void>;
}

const defaultActivationKeysInfo: ActivationKeyInfo[] = defaultActivationKeys.map(k => ({
  key: k,
  remaining_uses: 999,
  is_active: true
}));

// Check if Supabase is configured
const isSupabaseConfigured = () => {
  const url = import.meta.env['VITE_SUPABASE_URL'];
  const key = import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY'];
  return !!(url && key);
};

export const useLicenseStore = create<LicenseState>()(
  persist(
    (set, get) => ({
      activationKeys: defaultActivationKeysInfo,
      isLoading: false,
      lastFetched: null,

      addActivationKey: async (key: string, remainingUses: number = 999) => {
        const trimmed = key.trim().toUpperCase();
        if (!trimmed) return false;
        const current = get().activationKeys;
        if (current.some(k => k.key === trimmed)) return false;
        
        // Try Supabase if configured, otherwise just save locally
        if (isSupabaseConfigured()) {
          try {
            const result = await supabaseAddActivationKey(trimmed, remainingUses);
            if (!result) {
              // Supabase failed, save locally anyway
              set({ 
                activationKeys: [...current, { 
                  key: trimmed, 
                  remaining_uses: remainingUses, 
                  is_active: true 
                }] 
              });
              return true;
            }
          } catch (error) {
            console.error('[v0] Supabase error, saving locally:', error);
          }
        }
        
        // Save locally
        set({ 
          activationKeys: [...current, { 
            key: trimmed, 
            remaining_uses: remainingUses, 
            is_active: true 
          }] 
        });
        return true;
      },

      removeActivationKey: async (key: string) => {
        // Try Supabase if configured
        if (isSupabaseConfigured()) {
          try {
            await supabaseRemoveActivationKey(key);
          } catch (error) {
            console.error('[v0] Supabase error:', error);
          }
        }
        // Always remove locally
        set((state) => ({
          activationKeys: state.activationKeys.filter((k) => k.key !== key),
        }));
      },

      validateKey: async (key: string) => {
        const trimmed = key.trim().toUpperCase();
        // First check local cache
        const localKey = get().activationKeys.find(k => k.key === trimmed);
        if (localKey && localKey.is_active && localKey.remaining_uses > 0) {
          return localKey;
        }
        // Try Supabase if configured
        if (isSupabaseConfigured()) {
          try {
            const dbKey = await supabaseValidateActivationKey(trimmed);
            if (dbKey) {
              return {
                key: dbKey.key,
                remaining_uses: dbKey.remaining_uses ?? 999,
                is_active: dbKey.is_active
              };
            }
          } catch (error) {
            console.error('[v0] Supabase validation error:', error);
          }
        }
        return null;
      },

      getKeys: () => get().activationKeys,

      fetchFromCloud: async () => {
        set({ isLoading: true });
        try {
          // Skip if Supabase is not configured
          if (!isSupabaseConfigured()) {
            set({ isLoading: false, lastFetched: Date.now() });
            return;
          }
          
          const keys = await fetchActivationKeys();
          if (keys && keys.length > 0) {
            const keyInfos: ActivationKeyInfo[] = keys.map((k: any) => ({
              key: k.key,
              remaining_uses: k.remaining_uses ?? 999,
              is_active: k.is_active
            }));
            // Merge with defaults
            const allKeys = [...defaultActivationKeysInfo];
            for (const ki of keyInfos) {
              if (!allKeys.some(k => k.key === ki.key)) {
                allKeys.push(ki);
              }
            }
            set({ 
              activationKeys: allKeys,
              lastFetched: Date.now()
            });
          }
        } catch (error) {
          console.error('[v0] Error fetching activation keys:', error);
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: "habwa-licenses",
      version: 3,
      storage: createJSONStorage(() => obfuscatedStorage),
      partialize: (state) => ({
        activationKeys: state.activationKeys,
        lastFetched: state.lastFetched,
      }),
    },
  ),
);

interface ContentState {
  categories: Category[];
  playedQuestionIds: string[];
  isLoading: boolean;
  lastFetched: number | null;
  isSyncing: boolean;

  getCategoryByName: (name: string) => Category | undefined;
  getCategoryById: (id: string) => Category | undefined;
  getQuestionById: (categoryId: string, questionId: string) => Question | undefined;

  markQuestionPlayed: (categoryName: string, questionId: string) => void;
  resetPlayedHistory: () => Promise<void>;

  addCategory: (input: NewCategoryInput) => Promise<string>;
  updateCategory: (id: string, patch: Partial<Omit<Category, "id" | "questions">>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  addQuestion: (categoryId: string, input: NewQuestionInput) => Promise<string | null>;
  updateQuestion: (
    categoryId: string,
    questionId: string,
    patch: Partial<Omit<Question, "id">>,
  ) => Promise<void>;
  deleteQuestion: (categoryId: string, questionId: string) => Promise<void>;

  resetAllContent: () => Promise<void>;
  fetchFromCloud: () => Promise<void>;
  syncToCloud: () => Promise<void>;
}

export const useContentStore = create<ContentState>()(
  persist(
    (set, get) => ({
      categories: baseCategories,
      playedQuestionIds: [],
      isLoading: false,
      lastFetched: null,
      isSyncing: false,

      getCategoryByName: (name) => get().categories.find((c) => c.name === name),
      getCategoryById: (id) => get().categories.find((c) => c.id === id),
      getQuestionById: (categoryId, questionId) => {
        const cat = get().categories.find((c) => c.id === categoryId);
        return cat?.questions.find((q) => q.id === questionId);
      },

      markQuestionPlayed: (_categoryName, questionId) => {
        set((state) =>
          state.playedQuestionIds.includes(questionId)
            ? state
            : { playedQuestionIds: [...state.playedQuestionIds, questionId] }
        );
        // Sync to cloud in background
        supabaseMarkQuestionAsPlayed(questionId);
      },

      resetPlayedHistory: async () => {
        set({ playedQuestionIds: [] });
        await supabaseResetPlayedQuestions();
      },

      addCategory: async (input) => {
        const id = uid("cat");
        const newCat: Category = {
          id,
          name: input.name.trim(),
          iconKey: input.iconKey || "Star",
          iconUrl: input.iconUrl?.trim() || undefined,
          questions: [],
        };
        set((state) => ({ categories: [...state.categories, newCat] }));
        
        // Sync to Supabase
        await supabaseUpsertCategory({
          id,
          name: newCat.name,
          icon_key: newCat.iconKey,
          icon_url: newCat.iconUrl,
        });
        
        return id;
      },

      updateCategory: async (id, patch) => {
        const cat = get().categories.find((c) => c.id === id);
        if (!cat) return;

        const updated = {
          ...cat,
          ...patch,
          iconUrl: patch.iconUrl !== undefined ? patch.iconUrl?.trim() || undefined : cat.iconUrl,
        };

        set((state) => ({
          categories: state.categories.map((c) => (c.id === id ? updated : c)),
        }));

        // Sync to Supabase
        await supabaseUpsertCategory({
          id,
          name: updated.name,
          icon_key: updated.iconKey,
          icon_url: updated.iconUrl,
        });
      },

      deleteCategory: async (id) => {
        set((state) => ({
          categories: state.categories.filter((c) => c.id !== id),
        }));
        
        // Delete from Supabase
        await supabaseDeleteCategory(id);
      },

      addQuestion: async (categoryId, input) => {
        const cat = get().categories.find((c) => c.id === categoryId);
        if (!cat) return null;
        const qrEnabled = isWalaKelmaCategory(cat.name) ? true : (input.qrEnabled ?? false);
        const trimmed = input.question.trim();
        const isDuplicate = cat.questions.some(
          (q) =>
            q.question.trim().toLowerCase() === trimmed.toLowerCase() &&
            q.answer.trim().toLowerCase() === input.answer.trim().toLowerCase(),
        );
        if (isDuplicate) return null;
        const id = uid("q");
        const newQ: Question = {
          id,
          level: input.level,
          question: trimmed,
          answer: input.answer.trim(),
          imageUrl: input.imageUrl?.trim() || undefined,
          answerImageUrl: input.answerImageUrl?.trim() || undefined,
          videoUrl: input.videoUrl?.trim() || undefined,
          answerVideoUrl: input.answerVideoUrl?.trim() || undefined,
          qrEnabled,
        };
        set((state) => ({
          categories: state.categories.map((c) =>
            c.id === categoryId ? { ...c, questions: [...c.questions, newQ] } : c,
          ),
        }));
        
        // Make sure the category exists in the database (built-in categories may exist only locally)
        await supabaseUpsertCategory({
          id: cat.id,
          name: cat.name,
          icon_key: cat.iconKey,
          icon_url: cat.iconUrl,
        });

        // Sync to Supabase - only send fields that exist in the database
        const savedQuestion = await supabaseUpsertQuestion(categoryId, {
          id,
          level: newQ.level,
          question: newQ.question,
          answer: newQ.answer,
          image_url: newQ.imageUrl,
          answer_image_url: newQ.answerImageUrl,
          video_url: newQ.videoUrl,
          answer_video_url: newQ.answerVideoUrl,
          qr_enabled: newQ.qrEnabled,
        });

        if (!savedQuestion) {
          // Not saved permanently — remove local copy so it doesn't vanish later unnoticed
          set((state) => ({
            categories: state.categories.map((c) =>
              c.id === categoryId ? { ...c, questions: c.questions.filter((q) => q.id !== id) } : c,
            ),
          }));
          return null;
        }

        if (savedQuestion?.qr_token) {
          set((state) => ({
            categories: state.categories.map((c) =>
              c.id === categoryId
                ? {
                    ...c,
                    questions: c.questions.map((q) =>
                      q.id === id ? { ...q, qrToken: savedQuestion.qr_token } : q,
                    ),
                  }
                : c,
            ),
          }));
        }
        
        return id;
      },

      updateQuestion: async (categoryId, questionId, patch) => {
        const cat = get().categories.find((c) => c.id === categoryId);
        const existingQ = cat?.questions.find((q) => q.id === questionId);
        if (!existingQ) return;

        set((state) => ({
          categories: state.categories.map((c) =>
            c.id !== categoryId
              ? c
              : {
                  ...c,
                  questions: c.questions.map((q) =>
                    q.id !== questionId
                      ? q
                      : {
                          ...q,
                          ...patch,
                          imageUrl:
                            patch.imageUrl !== undefined
                              ? patch.imageUrl?.trim() || undefined
                              : q.imageUrl,
                          answerImageUrl:
                            patch.answerImageUrl !== undefined
                              ? patch.answerImageUrl?.trim() || undefined
                              : q.answerImageUrl,
                          videoUrl:
                            patch.videoUrl !== undefined
                              ? patch.videoUrl?.trim() || undefined
                              : q.videoUrl,
                          answerVideoUrl:
                            patch.answerVideoUrl !== undefined
                              ? patch.answerVideoUrl?.trim() || undefined
                              : q.answerVideoUrl,
                          qrEnabled: patch.qrEnabled !== undefined ? patch.qrEnabled : q.qrEnabled,
                        },
                  ),
                },
          ),
        }));

        const updatedQ = get().categories.find((c) => c.id === categoryId)?.questions.find((q) => q.id === questionId);
        if (updatedQ) {
          const savedQuestion = await supabaseUpsertQuestion(categoryId, {
            id: questionId,
            level: updatedQ.level,
            question: updatedQ.question,
            answer: updatedQ.answer,
            image_url: updatedQ.imageUrl,
            answer_image_url: updatedQ.answerImageUrl,
            video_url: updatedQ.videoUrl,
            answer_video_url: updatedQ.answerVideoUrl,
            qr_enabled: updatedQ.qrEnabled,
            qr_token: updatedQ.qrToken,
          });

          if (savedQuestion?.qr_token) {
            set((state) => ({
              categories: state.categories.map((c) =>
                c.id === categoryId
                  ? {
                      ...c,
                      questions: c.questions.map((q) =>
                        q.id === questionId ? { ...q, qrToken: savedQuestion.qr_token } : q,
                      ),
                    }
                  : c,
              ),
            }));
          }
        }
      },

      deleteQuestion: async (categoryId, questionId) => {
        set((state) => ({
          categories: state.categories.map((c) =>
            c.id !== categoryId
              ? c
              : { ...c, questions: c.questions.filter((q) => q.id !== questionId) },
          ),
          playedQuestionIds: state.playedQuestionIds.filter((id) => id !== questionId),
        }));
        
        // Delete from Supabase
        await supabaseDeleteQuestion(questionId);
      },

      resetAllContent: async () => {
        set({ categories: baseCategories, playedQuestionIds: [] });
        // Sync base categories to cloud
        await syncAllCategories(baseCategories);
        await supabaseResetPlayedQuestions();
      },

      fetchFromCloud: async () => {
        set({ isLoading: true });
        try {
          // Fetch categories with questions
          const cloudCategories = await fetchCategories();
          
          // Fetch played questions
          const playedIds = await fetchPlayedQuestions();
          
          if (cloudCategories && cloudCategories.length > 0) {
            // Transform cloud data to local format
            const categories: Category[] = cloudCategories.map((cat: any) => ({
              id: cat.id,
              name: cat.name,
              iconKey: cat.icon_key || "Star",
              iconUrl: cat.icon_url || undefined,
              questions: (cat.questions || []).map((q: any) => ({
                id: q.id,
                level: q.level as Difficulty,
                question: q.question,
                answer: q.answer,
                imageUrl: q.image_url || undefined,
                answerImageUrl: q.answer_image_url || undefined,
                videoUrl: q.video_url || undefined,
                answerVideoUrl: q.answer_video_url || undefined,
                qrEnabled: q.qr_enabled ?? false,
                qrToken: q.qr_token || undefined,
              })),
            }));
            
            set({
              categories: mergeCategories(categories, baseCategories),
              playedQuestionIds: playedIds || [],
              lastFetched: Date.now(),
            });
          } else {
            // No data in cloud, sync local data to cloud
            const localCategories = get().categories;
            if (localCategories.length > 0) {
              await syncAllCategories(localCategories);
            }
          }
        } catch (error) {
          console.error('[v0] Error fetching from cloud:', error);
        } finally {
          set({ isLoading: false });
        }
      },

      syncToCloud: async () => {
        set({ isSyncing: true });
        try {
          const categories = get().categories;
          await syncAllCategories(categories);
        } catch (error) {
          console.error('[v0] Error syncing to cloud:', error);
        } finally {
          set({ isSyncing: false });
        }
      },
    }),
    {
      name: "habwa-content",
      version: 4,
      storage: createJSONStorage(() => obfuscatedStorage),
      partialize: (state) => ({
        categories: state.categories,
        playedQuestionIds: state.playedQuestionIds,
        lastFetched: state.lastFetched,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<ContentState>;
        const storedCategories = persisted.categories ?? [];
        return {
          ...currentState,
          ...persisted,
          categories: mergeCategories(storedCategories, baseCategories),
        };
      },
    },
  ),
);

// Keep "played" history scoped to the signed-in account (each user_id has its own history).
if (typeof window !== "undefined") {
  let lastUserId: string | null | undefined;
  import("@/integrations/supabase/client").then(({ supabase }) => {
    supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id ?? null;
      if (uid === lastUserId) return;
      lastUserId = uid;
      if (!uid && window.sessionStorage.getItem("habwa-admin-unlocked") !== "1") {
        useContentStore.setState({ playedQuestionIds: [] });
        return;
      }
      setTimeout(() => {
        fetchPlayedQuestions().then((ids) => useContentStore.setState({ playedQuestionIds: ids }));
      }, 0);
    });
  });
}
