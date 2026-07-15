import { describe, expect, it } from 'vitest';
import { isValidWeightSum, normalizeWeights, weightSumDiff, WEIGHT_TOLERANCE } from './weights';

describe('isValidWeightSum', () => {
  it('accepts weights summing exactly to 1.0', () => {
    expect(isValidWeightSum([0.6, 0.4])).toBe(true);
  });

  it('accepts sums within the 1e-6 tolerance', () => {
    expect(isValidWeightSum([0.3333333, 0.3333333, 0.3333334])).toBe(true);
    expect(isValidWeightSum([1 + WEIGHT_TOLERANCE / 2])).toBe(true);
  });

  it('rejects sums outside tolerance', () => {
    expect(isValidWeightSum([0.5, 0.4])).toBe(false);
    expect(isValidWeightSum([0.5, 0.6])).toBe(false);
    expect(isValidWeightSum([1 + WEIGHT_TOLERANCE * 10])).toBe(false);
  });

  it('treats an empty sibling group as trivially valid', () => {
    expect(isValidWeightSum([])).toBe(true);
  });
});

describe('weightSumDiff', () => {
  it('reports shortfall as negative and surplus as positive', () => {
    expect(weightSumDiff([0.3, 0.3])).toBeCloseTo(-0.4, 9);
    expect(weightSumDiff([0.6, 0.6])).toBeCloseTo(0.2, 9);
  });
});

describe('normalizeWeights', () => {
  it('rescales remaining siblings proportionally to sum to 1.0', () => {
    // Original 3-way split 0.5/0.3/0.2; remove the 0.2 one, remaining 0.5/0.3 -> should scale to sum 1.
    const result = normalizeWeights([{ id: 'a', weight: 0.5 }, { id: 'b', weight: 0.3 }]);
    const total = result.reduce((s, r) => s + r.weight, 0);
    expect(total).toBeCloseTo(1, 9);
    expect(result.find((r) => r.id === 'a')!.weight).toBeCloseTo(0.625, 9);
    expect(result.find((r) => r.id === 'b')!.weight).toBeCloseTo(0.375, 9);
  });

  it('distributes evenly when all remaining weights are zero', () => {
    const result = normalizeWeights([{ id: 'a', weight: 0 }, { id: 'b', weight: 0 }]);
    expect(result).toEqual([{ id: 'a', weight: 0.5 }, { id: 'b', weight: 0.5 }]);
  });

  it('returns an empty array for no siblings', () => {
    expect(normalizeWeights([])).toEqual([]);
  });
});
