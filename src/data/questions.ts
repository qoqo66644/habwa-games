export type Difficulty = 200 | 400 | 600;

export interface Question {
  id: string;
  level: Difficulty;
  question: string;
  answer: string;
  imageUrl?: string | undefined;
  answerImageUrl?: string | undefined;
  videoUrl?: string | undefined;
  answerVideoUrl?: string | undefined;
  qrEnabled?: boolean | undefined;
  qrToken?: string | undefined;
}

export interface Category {
  id: string;
  name: string;
  iconKey: string;
  iconUrl?: string | undefined;
  questions: Question[];
}
