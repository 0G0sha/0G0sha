export type TargetModel = 'claude' | 'gpt' | 'general'
export type PromptCategory = 'coding' | 'writing' | 'analysis' | 'marketing' | 'general'
export type PromptComplexity = 'simple' | 'medium' | 'complex'
export type PromptElement = 'role' | 'context' | 'task' | 'constraints' | 'outputFormat' | 'examples'

export type Token = {
     word: string,
     isKeyword: boolean,
     weight: number
}
export type PromptGap = {
     element: PromptElement,
     severity: 'missing' | 'weak' | 'ok'
}
export type AnalysisResult = {
     tokens: Token[],
     keywords: string[],
     category: PromptCategory,
     complexity: PromptComplexity,
     intent: string,
     gaps: PromptGap[],
     rawScore: number
}

export type TransformRule = {
     id: string,
     name: string,
     element: PromptElement,
     condition: (text: string) => boolean,
     apply: (text: string) => string
}
export type LearnedWeight = {
     ruleId: string,
     category: PromptCategory,
     weight: number,
     totalUses: number,
     avgScore: number
}
export type SimilarPrompt = {
     originalText: string,
     optimizedText: string,
     score: number,
     category: PromptCategory,
     rulesApplied: string[],
     similarity: number
}

export type AgentInput = {
     text: string,
     targetModel: TargetModel,
     userId?: string
}
export type AgentOutput = {
     promptId: string,
     original: string,
     optimized: string,
     score: number,
     suggestions: string[],
     analysis: AnalysisResult
}
