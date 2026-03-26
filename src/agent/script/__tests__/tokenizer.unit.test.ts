import { describe, it, expect } from 'vitest'
import { tokenize, extractKeywords } from '../tokenizer'
import type { Token } from '../../@types'

// ─── tokenize() ────────────────────────────────────────────────────────────

describe('tokenize()', () => {
     it('returns empty array for empty string', () => {
          expect(tokenize('')).toEqual([])
     })

     it('returns empty array for whitespace-only string', () => {
          expect(tokenize('   ')).toEqual([])
     })

     it('lowercases all words', () => {
          const tokens = tokenize('CREATE BUILD ANALYZE')
          tokens.forEach(t => expect(t.word).toBe(t.word.toLowerCase()))
     })

     it('strips punctuation', () => {
          const tokens = tokenize('hello, world! api-first.')
          const words = tokens.map(t => t.word)
          expect(words).toContain('hello')
          expect(words).toContain('world')
          expect(words).toContain('api')
          expect(words).toContain('first')
     })

     it('filters out single-character words', () => {
          const tokens = tokenize('a b c word')
          expect(tokens.every(t => t.word.length > 1)).toBe(true)
     })

     it('assigns weight 0 and isKeyword false to stop words', () => {
          const tokens = tokenize('the is are for in to')
          tokens.forEach(t => {
               expect(t.weight).toBe(0)
               expect(t.isKeyword).toBe(false)
          })
     })

     it('assigns weight 3 to action verbs', () => {
          // action verbs that are NOT in STOP_WORDS
          const tokens = tokenize('create build analyze implement')
          const map = Object.fromEntries(tokens.map(t => [t.word, t]))
          const actionVerbs = ['create', 'build', 'analyze', 'implement']
          actionVerbs.forEach(v => {
               expect(map[v]?.weight).toBe(3)
               expect(map[v]?.isKeyword).toBe(true)
          })
     })

     it('assigns weight 2 to domain keywords', () => {
          const tokens = tokenize('api database react mongodb')
          tokens.forEach(t => {
               expect(t.weight).toBe(2)
               expect(t.isKeyword).toBe(true)
          })
     })

     it('assigns weight 1 to regular words not in any special set', () => {
          const tokens = tokenize('elephant mountain ocean')
          tokens.forEach(t => {
               expect(t.weight).toBe(1)
               expect(t.isKeyword).toBe(true)
          })
     })

     it('stop words take precedence over action verbs for shared words', () => {
          // 'make' is in both STOP_WORDS and ACTION_VERBS — stop word wins
          const tokens = tokenize('make it work')
          const makeToken = tokens.find(t => t.word === 'make')
          expect(makeToken?.weight).toBe(0)
          expect(makeToken?.isKeyword).toBe(false)
     })

     it('handles mixed text with all weight categories', () => {
          const tokens = tokenize('create an api endpoint')
          const map = Object.fromEntries(tokens.map(t => [t.word, t]))
          expect(map['create']?.weight).toBe(3)     // action verb
          expect(map['an']?.weight).toBe(0)         // stop word
          expect(map['api']?.weight).toBe(2)        // domain keyword
          expect(map['endpoint']?.weight).toBe(2)   // domain keyword
     })
})

// ─── extractKeywords() ─────────────────────────────────────────────────────

describe('extractKeywords()', () => {
     it('returns empty array for empty token list', () => {
          expect(extractKeywords([])).toEqual([])
     })

     it('excludes tokens where isKeyword is false', () => {
          const tokens: Token[] = [
               { word: 'the', isKeyword: false, weight: 0 },
               { word: 'api', isKeyword: true, weight: 2 },
          ]
          const keywords = extractKeywords(tokens)
          expect(keywords).not.toContain('the')
          expect(keywords).toContain('api')
     })

     it('excludes tokens with weight 0 even if isKeyword is true', () => {
          const tokens: Token[] = [
               { word: 'zero', isKeyword: true, weight: 0 },
               { word: 'build', isKeyword: true, weight: 3 },
          ]
          expect(extractKeywords(tokens)).not.toContain('zero')
     })

     it('sorts keywords by weight descending', () => {
          const tokens: Token[] = [
               { word: 'regular', isKeyword: true, weight: 1 },
               { word: 'create', isKeyword: true, weight: 3 },
               { word: 'api', isKeyword: true, weight: 2 },
          ]
          expect(extractKeywords(tokens)).toEqual(['create', 'api', 'regular'])
     })

     it('deduplicates repeated words', () => {
          const tokens: Token[] = [
               { word: 'api', isKeyword: true, weight: 2 },
               { word: 'api', isKeyword: true, weight: 2 },
               { word: 'build', isKeyword: true, weight: 3 },
          ]
          const keywords = extractKeywords(tokens)
          expect(keywords.filter(k => k === 'api').length).toBe(1)
     })

     it('returns all keywords when no duplicates exist', () => {
          const tokens: Token[] = [
               { word: 'create', isKeyword: true, weight: 3 },
               { word: 'api', isKeyword: true, weight: 2 },
               { word: 'elephant', isKeyword: true, weight: 1 },
          ]
          expect(extractKeywords(tokens)).toHaveLength(3)
     })

     it('integration: tokenize then extractKeywords returns valid keywords', () => {
          const tokens = tokenize('create an api with typescript and mongodb')
          const keywords = extractKeywords(tokens)
          expect(keywords).toContain('create')
          expect(keywords).toContain('api')
          expect(keywords).toContain('typescript')
          expect(keywords).toContain('mongodb')
          expect(keywords).not.toContain('an')
          expect(keywords).not.toContain('with')
     })
})
