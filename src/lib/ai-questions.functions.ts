import { createServerFn } from "@tanstack/react-start";
import type { GeneratedQuestionItem } from "./ai-questions.types";
import { isWalaKelmaCategory } from "./category-rules";

export type { GeneratedQuestionItem };

export const generateAIQuestions = createServerFn({ method: "POST" })
  .inputValidator((data: { categoryId: string; categoryName: string }) => data)
  .handler(async ({ data: { categoryId, categoryName } }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // جلب الأسئلة الحالية لنفس التصنيف لمنع التكرار
    const { data: existing } = await supabaseAdmin
      .from("questions")
      .select("question")
      .eq("category_id", categoryId);

    const existingQuestions =
      existing && existing.length > 0
        ? existing
            .map((q: { question: string }) => q.question)
            .slice(-35)
            .join("\n")
        : "لا توجد أسئلة سابقة مسجلة";

    const prompt = `أنت مُعد أسئلة محترف لمسابقات الجمعات والتحديات التنافسية.
المطلوب توليد 3 أسئلة جديدة كلياً وغير مكررة للتصنيف: "${categoryName}".

توزيع المستويات:
- مستوى 200 (سهل/متوسط): معلومة معروفة وممتعة للمهتم بالتصنيف، تحتاج سرعة بديهة، وليست مبتذلة.
- مستوى 400 (تحدي): سؤال دقيق وممتع يحتاج تركيز ونقاش بين الفريقين.
- مستوى 600 (صعب للخبراء): سؤال عميق ودقيق جداً يتحدى محبي هذا المجال.

معايير صارمة:
1. الإجابة قطعية ومحددة وموجزة جداً (اسم، سنة، دولة، نادٍ، عنوان عمل، رقم).
2. ابتعد عن أسئلة المناهج المدرسية السطحية.
3. امنع منعاً باتاً تكرار أي سؤال أو فكرة من هذه الأسئلة المسجلة مسبقاً:
${existingQuestions}

أرجع الناتج بصيغة JSON فقط بالشكل:
{"questions":[{"level":200,"question":"...","answer":"..."},{"level":400,"question":"...","answer":"..."},{"level":600,"question":"...","answer":"..."}]}`;

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("مفتاح الذكاء الاصطناعي غير متوفر");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify({
        model: "google/gemini-3.7-flash",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      if (response.status === 429) throw new Error("تم تجاوز حد الاستخدام، حاول بعد قليل");
      if (response.status === 402) throw new Error("انتهى رصيد الذكاء الاصطناعي، يرجى إضافة رصيد");
      throw new Error(`فشل الاتصال بالذكاء الاصطناعي: ${errText}`);
    }

    const result = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const rawText = result.choices?.[0]?.message?.content ?? "{}";

    let questions: GeneratedQuestionItem[] = [];
    try {
      const parsed = JSON.parse(rawText) as
        | GeneratedQuestionItem[]
        | { questions?: GeneratedQuestionItem[] };
      questions = Array.isArray(parsed) ? parsed : (parsed.questions ?? []);
    } catch {
      throw new Error("تعذّر قراءة الأسئلة المولّدة، حاول مرة أخرى");
    }

    return { questions };
  });

export const saveBatchQuestions = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { categoryId: string; categoryName?: string; questions: GeneratedQuestionItem[] }) =>
      data,
  )
  .handler(async ({ data: { categoryId, categoryName, questions } }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Make sure the category row exists before inserting questions that reference it.
    const { error: catError } = await supabaseAdmin
      .from("categories")
      .upsert({ id: categoryId, name: categoryName ?? categoryId }, { onConflict: "id" });
    if (catError) throw new Error(catError.message);

    const records = questions.map((q) => ({
      id: crypto.randomUUID(),
      category_id: categoryId,
      level: q.level,
      question: q.question.trim(),
      answer: q.answer.trim(),
      qr_enabled: isWalaKelmaCategory(categoryName ?? ""),
    }));

    const { error } = await supabaseAdmin.from("questions").insert(records);
    if (error) throw new Error(error.message);
    return { success: true, count: records.length };
  });
