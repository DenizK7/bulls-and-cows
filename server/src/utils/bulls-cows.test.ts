import { describe, it, expect } from 'vitest';
import { evaluate, generateAllCodes, randomSecret } from './bulls-cows.js';
import { isValidGuess } from '@bulls-and-cows/shared';

describe('evaluate', () => {
  it('returns 4 bulls for exact match', () => {
    expect(evaluate('1234', '1234')).toEqual({ bulls: 4, cows: 0 });
  });

  it('returns 0 bulls 0 cows for no match', () => {
    expect(evaluate('1234', '5678')).toEqual({ bulls: 0, cows: 0 });
  });

  it('returns correct bulls and cows', () => {
    expect(evaluate('1234', '1325')).toEqual({ bulls: 1, cows: 2 });
  });

  it('returns all cows when all digits present but wrong positions', () => {
    expect(evaluate('1234', '4321')).toEqual({ bulls: 0, cows: 4 });
  });

  it('handles the example from the plan', () => {
    expect(evaluate('4285', '1234')).toEqual({ bulls: 1, cows: 1 });
  });
});

describe('generateAllCodes', () => {
  it('generates exactly 5040 codes', () => {
    expect(generateAllCodes()).toHaveLength(5040);
  });

  it('all codes are valid', () => {
    const codes = generateAllCodes();
    for (const code of codes) {
      expect(isValidGuess(code)).toBe(true);
    }
  });

  it('has no duplicates', () => {
    const codes = generateAllCodes();
    expect(new Set(codes).size).toBe(5040);
  });
});

describe('randomSecret', () => {
  it('generates valid secrets', () => {
    for (let i = 0; i < 100; i++) {
      expect(isValidGuess(randomSecret())).toBe(true);
    }
  });
});
