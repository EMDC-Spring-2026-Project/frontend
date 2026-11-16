// Scores are entered in whole or half points (e.g. 4 or 4.5).
export const SCORE_STEP = 0.5;

export type ScoreValidation = {
  /** The parsed score, or undefined when the box is empty or invalid. */
  value: number | undefined;
  /** A message to show the judge, or null when the entry is fine. */
  error: string | null;
};

export function validateScore(raw: string, low: number, high: number): ScoreValidation {
  const text = raw.trim();
  if (text === "") return { value: undefined, error: null };

  const value = Number(text);
  if (!Number.isFinite(value)) return { value: undefined, error: "Enter a number" };
  if (value < low) return { value: undefined, error: `Lowest score is ${low}` };
  if (value > high) return { value: undefined, error: `Highest score is ${high}` };
  if (!Number.isInteger(value / SCORE_STEP)) {
    return { value: undefined, error: "Use whole or half points, like 4 or 4.5" };
  }
  return { value, error: null };
}
