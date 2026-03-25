import { Token } from "../@types";
import { ACTION_VERBS, DOMAIN_KEYWORDS, STOP_WORDS } from "../data/tokenizer.data";

function calcWeight(word: string): number {
     if (STOP_WORDS.has(word)) return 0;
     if (ACTION_VERBS.has(word)) return 3;
     if (DOMAIN_KEYWORDS.has(word)) return 2;
     return 1;
}

export const tokenize = (text: string) => {
     const words = text
          .toLowerCase()
          .replace(/[^\w\s]/g, ' ')
          .split(/\s+/)
          .filter((w) => w.length > 1);

     return words.map((word) => ({
          word,
          isKeyword: !STOP_WORDS.has(word),
          weight: calcWeight(word),
     }));
}

export const extractKeywords = (tokens: Token[]): string[] => {
     return tokens
          .filter((t) => t.isKeyword && t.weight > 0)
          .sort((a, b) => b.weight - a.weight)
          .map((t) => t.word)
          .filter((w, i, arr) => arr.indexOf(w) === i); // dedupe
}
