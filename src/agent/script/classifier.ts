import type { Token, PromptCategory, PromptComplexity } from '../@types/index.js';

export function classify(tokens: Token[]): PromptCategory {
     const scores: Record<PromptCategory, number> = {
          coding: 0, writing: 0, analysis: 0, marketing: 0, general: 0,
     };

     const keywords = tokens.filter((t) => t.isKeyword).map((t) => t.word);

     for (const [category, keywordMap] of Object.entries(CATEGORY_KEYWORDS)) {
          for (const word of keywords) {
               if (keywordMap[word]) {
                    scores[category as PromptCategory] += keywordMap[word];
               }
          }
     }

     let best: PromptCategory = 'general';
     let bestScore = 0;

     for (const [cat, score] of Object.entries(scores)) {
          if (score > bestScore) {
               bestScore = score;
               best = cat as PromptCategory;
          }
     }

     return bestScore >= 3 ? best : 'general';
}

export function assessComplexity(text: string, keywords: string[]): PromptComplexity {
     const wordCount = text.split(/\s+/).length;
     const actionCount = keywords.filter((k) => ACTION_KEYWORDS.has(k)).length;

     if (wordCount > 80 || keywords.length > 12 || actionCount >= 3) return 'complex';
     if (wordCount > 30 || keywords.length > 6 || actionCount >= 2) return 'medium';
     return 'simple';
}

export function extractIntent(keywords: string[]): string {
     const top = keywords.slice(0, 5);
     if (top.length === 0) return 'general request';
     return `User wants to: ${top.join(', ')}`;
}
