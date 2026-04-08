import { evaluate, generateAllCodes } from './bulls-cows.js';

const ALL_CODES = generateAllCodes();

const OPTIMAL_FIRST_GUESS = '1023';

export function filterPossibilities(
  possibilities: string[],
  guess: string,
  bulls: number,
  cows: number,
): string[] {
  return possibilities.filter((code) => {
    const result = evaluate(guess, code);
    return result.bulls === bulls && result.cows === cows;
  });
}

function minimax(possibilities: string[], allCodes: string[]): string {
  if (possibilities.length <= 2) return possibilities[0];

  // When few possibilities remain, only search among them for speed
  const candidates =
    possibilities.length <= 500 ? allCodes : possibilities;

  let bestGuess = possibilities[0];
  let bestWorstCase = Infinity;

  const possSet = new Set(possibilities);

  for (const guess of candidates) {
    const partitions = new Map<string, number>();

    for (const possible of possibilities) {
      const { bulls, cows } = evaluate(guess, possible);
      const key = `${bulls},${cows}`;
      partitions.set(key, (partitions.get(key) || 0) + 1);
    }

    const worstCase = Math.max(...partitions.values());

    if (
      worstCase < bestWorstCase ||
      (worstCase === bestWorstCase && possSet.has(guess) && !possSet.has(bestGuess))
    ) {
      bestWorstCase = worstCase;
      bestGuess = guess;
    }
  }

  return bestGuess;
}

export class KnuthSolver {
  private possibilities: string[];

  constructor() {
    this.possibilities = [...ALL_CODES];
  }

  nextGuess(): string {
    if (this.possibilities.length === ALL_CODES.length) {
      return OPTIMAL_FIRST_GUESS;
    }
    return minimax(this.possibilities, ALL_CODES);
  }

  processResult(guess: string, bulls: number, cows: number): void {
    this.possibilities = filterPossibilities(
      this.possibilities,
      guess,
      bulls,
      cows,
    );
  }

  get remainingCount(): number {
    return this.possibilities.length;
  }
}

export class SimpleSolver {
  private possibilities: string[];

  constructor() {
    this.possibilities = [...ALL_CODES];
  }

  nextGuess(): string {
    return this.possibilities[
      Math.floor(Math.random() * this.possibilities.length)
    ];
  }

  processResult(guess: string, bulls: number, cows: number): void {
    this.possibilities = filterPossibilities(
      this.possibilities,
      guess,
      bulls,
      cows,
    );
  }
}

export class RandomGuesser {
  nextGuess(): string {
    return ALL_CODES[Math.floor(Math.random() * ALL_CODES.length)];
  }

  processResult(): void {
    // Does not learn
  }
}
