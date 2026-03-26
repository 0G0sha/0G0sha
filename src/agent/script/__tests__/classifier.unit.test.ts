import { describe, it, expect } from 'vitest'
import { classify, assessComplexity, extractIntent } from '../classifier'
import type { Token } from '../../@types'

function tok(word: string, isKeyword = true): Token {
     return { word, isKeyword, weight: isKeyword ? 1 : 0 }
}

// ─── classify() ────────────────────────────────────────────────────────────

describe('classify()', () => {
     it('returns "general" when tokens produce no category matches', () => {
          expect(classify([tok('elephant'), tok('mountain')])).toBe('general')
     })

     it('returns "general" when best score is below threshold (3)', () => {
          // 'variable' → weight 1 in coding → score 1 < 3
          expect(classify([tok('variable')])).toBe('general')
     })

     it('returns "coding" for coding tokens that meet threshold', () => {
          // code=3, api=3, debug=3 → score 9
          expect(classify([tok('code'), tok('api'), tok('debug')])).toBe('coding')
     })

     it('returns "writing" for writing tokens that meet threshold', () => {
          // write=3, article=3, blog=3 → score 9
          expect(classify([tok('write'), tok('article'), tok('blog')])).toBe('writing')
     })

     it('returns "analysis" for analysis tokens that meet threshold', () => {
          // analyze=3, data=3, report=3 → score 9
          expect(classify([tok('analyze'), tok('data'), tok('report')])).toBe('analysis')
     })

     it('returns "marketing" for marketing tokens that meet threshold', () => {
          // marketing=3, seo=3, campaign=3 → score 9
          expect(classify([tok('marketing'), tok('seo'), tok('campaign')])).toBe('marketing')
     })

     it('ignores tokens where isKeyword is false', () => {
          const tokens: Token[] = [
               { word: 'code', isKeyword: false, weight: 0 },
               { word: 'api', isKeyword: false, weight: 0 },
               { word: 'debug', isKeyword: false, weight: 0 },
          ]
          expect(classify(tokens)).toBe('general')
     })

     it('picks the highest-scoring category when multiple score', () => {
          // coding: code=3, api=3 → 6
          // marketing: marketing=3 → 3
          expect(classify([tok('code'), tok('api'), tok('marketing')])).toBe('coding')
     })

     it('returns exact threshold category when score equals 3', () => {
          // single keyword with weight 3 → score exactly 3
          expect(classify([tok('code')])).toBe('coding')
     })
})

// ─── assessComplexity() ────────────────────────────────────────────────────

describe('assessComplexity()', () => {
     it('returns "simple" for short text with few keywords and no actions', () => {
          expect(assessComplexity('short text', ['elephant'])).toBe('simple')
     })

     it('returns "medium" when word count exceeds 30', () => {
          const text = Array(31).fill('word').join(' ')
          expect(assessComplexity(text, ['elephant'])).toBe('medium')
     })

     it('returns "medium" when keyword count exceeds 6', () => {
          const keywords = ['a', 'b', 'c', 'd', 'e', 'f', 'g']   // 7
          expect(assessComplexity('short text', keywords)).toBe('medium')
     })

     it('returns "medium" when exactly 2 action keywords are present', () => {
          // 'create' and 'build' are in ACTION_KEYWORDS
          expect(assessComplexity('short text', ['create', 'build'])).toBe('medium')
     })

     it('returns "complex" when word count exceeds 80', () => {
          const text = Array(81).fill('word').join(' ')
          expect(assessComplexity(text, ['elephant'])).toBe('complex')
     })

     it('returns "complex" when keyword count exceeds 12', () => {
          const keywords = Array(13).fill(0).map((_, i) => `kw${i}`)
          expect(assessComplexity('short text', keywords)).toBe('complex')
     })

     it('returns "complex" when 3 or more action keywords are present', () => {
          const keywords = ['create', 'build', 'analyze']   // 3 ACTION_KEYWORDS
          expect(assessComplexity('short text', keywords)).toBe('complex')
     })

     it('returns "complex" when word count exactly hits 81', () => {
          const text = Array(81).fill('word').join(' ')
          expect(assessComplexity(text, [])).toBe('complex')
     })

     it('returns "simple" for empty text and empty keywords', () => {
          expect(assessComplexity('', [])).toBe('simple')
     })
})

// ─── extractIntent() ───────────────────────────────────────────────────────

describe('extractIntent()', () => {
     it('returns "general request" for empty keyword list', () => {
          expect(extractIntent([])).toBe('general request')
     })

     it('returns formatted intent string joining all keywords when ≤ 5', () => {
          expect(extractIntent(['create', 'api'])).toBe('User wants to: create, api')
     })

     it('returns only the top 5 keywords', () => {
          const keywords = ['a', 'b', 'c', 'd', 'e', 'f', 'g']
          expect(extractIntent(keywords)).toBe('User wants to: a, b, c, d, e')
     })

     it('returns exactly 5 keywords when list length equals 5', () => {
          const keywords = ['a', 'b', 'c', 'd', 'e']
          expect(extractIntent(keywords)).toBe('User wants to: a, b, c, d, e')
     })

     it('returns single keyword string for one-item list', () => {
          expect(extractIntent(['optimize'])).toBe('User wants to: optimize')
     })
})
