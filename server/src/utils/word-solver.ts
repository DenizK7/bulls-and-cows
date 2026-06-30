import type { AIDifficulty } from '@bulls-and-cows/shared';
import { evaluate } from './bulls-cows.js';
import { wordList, type WordLang } from './words.js';

// Candidate-elimination word solver. Same interface as the digit solvers
// (nextGuess / processResult) so it drops into the AI service.
export class WordSolver {
  private all: string[];
  private candidates: string[];
  private difficulty: AIDifficulty;

  constructor(lang: WordLang, difficulty: AIDifficulty) {
    this.all = wordList(lang);
    this.candidates = [...this.all];
    this.difficulty = difficulty;
  }

  nextGuess(): string {
    // easy: never learns — random word from the whole list
    if (this.difficulty === 'easy' || this.candidates.length === 0) {
      return this.all[Math.floor(Math.random() * this.all.length)];
    }
    // medium: random among still-consistent candidates
    if (this.difficulty === 'medium') {
      return this.candidates[Math.floor(Math.random() * this.candidates.length)];
    }
    // hard: deterministic elimination (first remaining candidate)
    return this.candidates[0];
  }

  processResult(guess: string, bulls: number, cows: number): void {
    if (this.difficulty === 'easy') return; // easy doesn't narrow down
    this.candidates = this.candidates.filter((w) => {
      const r = evaluate(guess, w);
      return r.bulls === bulls && r.cows === cows;
    });
  }
}
