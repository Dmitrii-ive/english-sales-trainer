// SM-2 spaced repetition algorithm.
// https://en.wikipedia.org/wiki/SuperMemo#Description_of_SM-2_algorithm

import type { Grade, ReviewState } from "./types";

export function nextReview(
  prev: Pick<ReviewState, "ease" | "interval_days" | "repetitions">,
  grade: Grade,
): Pick<ReviewState, "ease" | "interval_days" | "repetitions"> & {
  next_review_at: Date;
} {
  let { ease, interval_days, repetitions } = prev;

  if (grade < 3) {
    repetitions = 0;
    interval_days = 1;
  } else {
    repetitions += 1;
    if (repetitions === 1) interval_days = 1;
    else if (repetitions === 2) interval_days = 3;
    else interval_days = Math.round(interval_days * ease);
  }

  ease = ease + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
  if (ease < 1.3) ease = 1.3;

  const next = new Date();
  next.setDate(next.getDate() + interval_days);

  return {
    ease,
    interval_days,
    repetitions,
    next_review_at: next,
  };
}

// UI exposes 3 buttons; map them to SM-2 grades.
export const UI_GRADE: Record<"hard" | "good" | "easy", Grade> = {
  hard: 2,
  good: 4,
  easy: 5,
};
