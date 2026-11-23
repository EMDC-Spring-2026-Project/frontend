type PenaltyDefinition = { pointValue?: number | string; isIncrement?: boolean };

/**
 * Turns the points stored on a scoresheet back into what the penalty form
 * shows: 0/1 for a checkbox, or a count for an increment penalty.
 *
 * A checkbox counts as ticked for any non-zero value, so sheets saved before
 * a penalty's point value changed (for example 5 → 10) still show as ticked.
 */
export function penaltyCountFromPoints(points: unknown, penalty: PenaltyDefinition): number {
  const value = Math.abs(Number(points) || 0);
  if (value === 0) return 0;
  if (!penalty.isIncrement) return 1;
  const pointValue = Number(penalty.pointValue) || 0;
  return pointValue === 0 ? 0 : Math.round(value / pointValue);
}
