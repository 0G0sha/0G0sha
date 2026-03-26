import { tokenize, extractKeywords } from '../../../agent/script/tokenizer'
import { classify, assessComplexity, extractIntent } from '../../../agent/script/classifier'
import type { AnalysisResult } from '../../../agent/@types'
import { calcRawScore, detect } from '../../../gen-import'

export class AgentService {
     public analyze(text: string): AnalysisResult {
          const tokens = tokenize(text)
          const keywords = extractKeywords(tokens)
          const category = classify(tokens)
          const complexity = assessComplexity(text, keywords)
          const intent = extractIntent(keywords)
          const gaps = detect(text)
          const rawScore = calcRawScore(gaps)

          return {
               tokens,
               keywords,
               category,
               complexity,
               intent,
               gaps,
               rawScore,
          }
     }
}
