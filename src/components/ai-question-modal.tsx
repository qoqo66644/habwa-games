import { useState, useEffect } from "react";
import { Sparkles, Check, X, RefreshCw } from "lucide-react";
import type { GeneratedQuestionItem } from "@/lib/ai-questions.types";

interface Props {
  isOpen: boolean;
  categoryName: string;
  questions: GeneratedQuestionItem[];
  isLoading: boolean;
  onClose: () => void;
  onSave: (questions: GeneratedQuestionItem[]) => Promise<void>;
  onRegenerate: () => void;
}

export function AiQuestionModal({
  isOpen,
  categoryName,
  questions: initialQuestions,
  isLoading,
  onClose,
  onSave,
  onRegenerate,
}: Props) {
  const [editableQuestions, setEditableQuestions] = useState<GeneratedQuestionItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (initialQuestions && initialQuestions.length > 0) {
      setEditableQuestions(initialQuestions);
    }
  }, [initialQuestions]);

  if (!isOpen) return null;

  const handleTextChange = (index: number, field: "question" | "answer", value: string) => {
    setEditableQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, [field]: value } : q)),
    );
  };

  const handleConfirm = async () => {
    setIsSaving(true);
    try {
      await onSave(editableQuestions);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      dir="rtl"
    >
      <div className="w-full max-w-2xl bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary animate-pulse" />
            <h3 className="text-xl font-bold">أسئلة مقترحة: {categoryName}</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground">
              جاري التفكير وتوليد أسئلة تنافسية غير مكررة...
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {editableQuestions.map((q, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-muted/40 border border-border/60 space-y-3">
                <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-primary/10 text-primary inline-block">
                  مستوى {q.level} نقطة
                </span>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">السؤال:</label>
                  <input
                    type="text"
                    value={q.question}
                    onChange={(e) => handleTextChange(idx, "question", e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm font-medium focus:border-primary outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">الإجابة القطعية:</label>
                  <input
                    type="text"
                    value={q.answer}
                    onChange={(e) => handleTextChange(idx, "answer", e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm font-bold text-success focus:border-primary outline-none"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <button
            type="button"
            disabled={isLoading || isSaving}
            onClick={onRegenerate}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            توليد خيارات أخرى
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-bold text-muted-foreground hover:bg-muted"
            >
              إلغاء
            </button>
            <button
              type="button"
              disabled={isLoading || isSaving || editableQuestions.length === 0}
              onClick={handleConfirm}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold bg-primary text-primary-foreground hover:brightness-110 shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              حفظ الأسئلة في البنك
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
