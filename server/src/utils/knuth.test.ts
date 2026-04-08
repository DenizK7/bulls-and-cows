import { describe, it, expect } from 'vitest';
import { KnuthSolver, SimpleSolver, filterPossibilities } from './knuth.js';
import { evaluate, generateAllCodes } from './bulls-cows.js';

describe('filterPossibilities', () => {
  it('filters correctly after a guess', () => {
    const all = generateAllCodes();
    const filtered = filterPossibilities(all, '1234', 1, 1);
    // Every remaining code should produce 1 bull 1 cow when guessed with '1234'
    for (const code of filtered) {
      const result = evaluate('1234', code);
      expect(result).toEqual({ bulls: 1, cows: 1 });
    }
  });
});

describe('KnuthSolver', () => {
  it('solves any secret in at most 7 guesses', () => {
    const secrets = ['1234', '5678', '3507'];

    for (const secret of secrets) {
      const solver = new KnuthSolver();
      let solved = false;

      for (let round = 1; round <= 7; round++) {
        const guess = solver.nextGuess();
        const { bulls, cows } = evaluate(guess, secret);
        if (bulls === 4) {
          solved = true;
          break;
        }
        solver.processResult(guess, bulls, cows);
      }

      expect(solved).toBe(true);
    }
  });
});

describe('SimpleSolver', () => {
  it('solves a secret using elimination', () => {
    const secret = '4271';
    const solver = new SimpleSolver();
    let solved = false;

    for (let round = 1; round <= 20; round++) {
      const guess = solver.nextGuess();
      const { bulls, cows } = evaluate(guess, secret);
      if (bulls === 4) {
        solved = true;
        break;
      }
      solver.processResult(guess, bulls, cows);
    }

    expect(solved).toBe(true);
  });
});
