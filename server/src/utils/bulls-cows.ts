import type { EvaluationResult } from '@bulls-and-cows/shared';
import { DIGIT_COUNT } from '@bulls-and-cows/shared';

export function evaluate(guess: string, secret: string): EvaluationResult {
  let bulls = 0;
  let cows = 0;

  // Track which secret digits are already matched as bulls
  const secretUsed = new Array(DIGIT_COUNT).fill(false);
  const guessUsed = new Array(DIGIT_COUNT).fill(false);

  // First pass: count bulls (exact matches)
  for (let i = 0; i < DIGIT_COUNT; i++) {
    if (guess[i] === secret[i]) {
      bulls++;
      secretUsed[i] = true;
      guessUsed[i] = true;
    }
  }

  // Second pass: count cows (right digit, wrong position)
  for (let i = 0; i < DIGIT_COUNT; i++) {
    if (guessUsed[i]) continue;
    for (let j = 0; j < DIGIT_COUNT; j++) {
      if (secretUsed[j]) continue;
      if (guess[i] === secret[j]) {
        cows++;
        secretUsed[j] = true;
        break;
      }
    }
  }

  return { bulls, cows };
}

export function generateAllCodes(maxDigit: number = 9): string[] {
  const codes: string[] = [];
  for (let a = 0; a <= maxDigit; a++)
    for (let b = 0; b <= maxDigit; b++) {
      if (b === a) continue;
      for (let c = 0; c <= maxDigit; c++) {
        if (c === a || c === b) continue;
        for (let d = 0; d <= maxDigit; d++) {
          if (d === a || d === b || d === c) continue;
          codes.push(`${a}${b}${c}${d}`);
        }
      }
    }
  return codes;
}

export function randomSecret(maxDigit: number = 9): string {
  const digits = Array.from({ length: maxDigit + 1 }, (_, i) => i);
  for (let i = digits.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [digits[i], digits[j]] = [digits[j], digits[i]];
  }
  return digits.slice(0, DIGIT_COUNT).join('');
}
