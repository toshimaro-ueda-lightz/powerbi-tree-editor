// Sibling weight sum validation & normalization helpers.

export const WEIGHT_TOLERANCE = 1e-6;

export function sumWeights(weights: number[]): number {
  return weights.reduce((a, b) => a + b, 0);
}

/** True when the weights sum to 1.0 within tolerance. Empty list is valid (nothing to sum). */
export function isValidWeightSum(weights: number[], tolerance = WEIGHT_TOLERANCE): boolean {
  if (weights.length === 0) return true;
  return Math.abs(sumWeights(weights) - 1) <= tolerance;
}

/** Signed difference from 1.0 (positive = surplus, negative = shortfall). */
export function weightSumDiff(weights: number[]): number {
  return sumWeights(weights) - 1;
}

export interface WeightedItem {
  id: string;
  weight: number;
}

/**
 * Proportionally rescales weights so they sum to 1.0. Used after detaching
 * a sibling so the remaining children's weights stay valid. If the
 * remaining total is 0 (e.g. all zero-weighted), distributes evenly.
 */
export function normalizeWeights(items: WeightedItem[]): WeightedItem[] {
  if (items.length === 0) return [];
  const total = sumWeights(items.map((i) => i.weight));
  if (total <= 0) {
    const even = 1 / items.length;
    return items.map((i) => ({ id: i.id, weight: even }));
  }
  return items.map((i) => ({ id: i.id, weight: i.weight / total }));
}
