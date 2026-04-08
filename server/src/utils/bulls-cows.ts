import type { EvaluationResult } from '@bulls-and-cows/shared';
import { DIGIT_COUNT } from '@bulls-and-cows/shared';

export function evaluate(guess: string, secret: string): EvaluationResult {
  let bulls = 0;
  let cows = 0;

  for (let i = 0; i < DIGIT_COUNT; i++) {
    if (guess[i] === secret[i]) {
      bulls++;
    } else if (secret.includes(guess[i])) {
      cows++;
    }
  }

  return { bulls, cows };
}

export function generateAllCodes(): string[] {
  const codes: string[] = [];
  for (let a = 0; a <= 9; a++)
    for (let b = 0; b <= 9; b++) {
      if (b === a) continue;
      for (let c = 0; c <= 9; c++) {
        if (c === a || c === b) continue;
        for (let d = 0; d <= 9; d++) {
          if (d === a || d === b || d === c) continue;
          codes.push(`${a}${b}${c}${d}`);
        }
      }
    }
  return codes;
}

export function randomSecret(): string {
  const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (let i = digits.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [digits[i], digits[j]] = [digits[j], digits[i]];
  }
  return digits.slice(0, DIGIT_COUNT).join('');
}
