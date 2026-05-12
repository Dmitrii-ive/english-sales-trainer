export type ItemType =
  | "sales_phrase"
  | "vocabulary"
  | "speaking"
  | "roleplay"
  | "cloze"
  | "error_finding"
  | "quiz";

export type ExerciseMode =
  | "audio_repeat"  // sales phrases: hear → repeat
  | "ru_en"         // sales phrases: translate RU → EN
  | "flip"          // sales phrases / vocab: show → flip card
  | "speaking"      // speaking practice
  | "roleplay"
  | "cloze"
  | "error_finding"
  | "quiz";

export type DailyExercise = {
  type: ItemType;
  mode?: ExerciseMode;
  item_ids: string[];
};

export type SalesPhrase = {
  id: string;
  text_en: string;
  text_ru: string;
  context: string | null;
  category: string | null;
  meeting_ref: string | null;
  notes: string | null;
  keywords: string[] | null;
};

export type VocabularyItem = {
  id: string;
  word_en: string;
  word_ru: string;
  example_en: string | null;
  part_of_speech: string | null;
  meeting_ref: string | null;
};

export type SpeakingItem = {
  id: string;
  text_en: string;
  text_ru: string | null;
  meeting_ref: string | null;
};

export type RoleplayScenario = {
  id: string;
  situation: string;
  customer_line_en: string;
  customer_line_ru: string | null;
  suggested_response_en: string | null;
  rubric: string | null;
  meeting_ref: string | null;
};

export type ClozeItem = {
  id: string;
  full_text_en: string;
  blanks: { position: number; answer: string; alternatives?: string[] }[];
  hint_ru: string | null;
  meeting_ref: string | null;
};

export type ErrorFindingItem = {
  id: string;
  text_with_error: string;
  correct_text: string;
  error_explanation: string | null;
  meeting_ref: string | null;
};

export type QuizQuestion = {
  id: string;
  quiz_topic: string;
  scenario: string | null;
  question: string;
  options: string[];
  correct_index: number;
  option_whys: string[] | null;
  explanation: string | null;
  meeting_ref: string | null;
};

export type DailyPlan = {
  id: string;
  date: string;
  day_of_week: number;
  focus: string | null;
  exercises: DailyExercise[];
};

export type ReviewState = {
  item_type: ItemType;
  item_id: string;
  ease: number;
  interval_days: number;
  repetitions: number;
  next_review_at: string;
};

// SM-2 grade. 0 = total blackout, 5 = perfect recall.
// In our UI we expose 3 buttons: "Hard" → 2, "Good" → 4, "Easy" → 5.
export type Grade = 0 | 1 | 2 | 3 | 4 | 5;
