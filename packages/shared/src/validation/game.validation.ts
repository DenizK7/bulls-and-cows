import { DIGIT_COUNT, MIN_DIGIT, MAX_DIGIT } from '../constants/game.constants.js';

export function isValidGuess(input: string, maxDigit: number = MAX_DIGIT): boolean {
  if (input.length !== DIGIT_COUNT) return false;
  const digits = input.split('');
  return (
    digits.every(d => /^\d$/.test(d)) &&
    new Set(digits).size === DIGIT_COUNT &&
    digits.every(d => {
      const n = parseInt(d, 10);
      return n >= MIN_DIGIT && n <= maxDigit;
    })
  );
}

export const isValidSecret = isValidGuess;
