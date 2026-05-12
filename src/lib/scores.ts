// Map SM-2 ease factor [1.3 .. ~3.0] → score [0..100].
// 1.3 = struggling, 2.5 = default, 3.0+ = easy / mastered.
export function easeToScore(ease: number | null | undefined): number {
  if (ease == null) return 0;
  const clamped = Math.max(1.3, Math.min(3.0, ease));
  return Math.round(((clamped - 1.3) / 1.7) * 100);
}

export const SCORE_GROUPS = {
  vocab: ["vocabulary"],
  grammar: ["cloze", "error_finding", "drill"],
  fluency: ["sales_phrase", "speaking", "roleplay", "quiz"],
} as const;
