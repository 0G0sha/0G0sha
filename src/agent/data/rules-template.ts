import { PromptCategory, PromptComplexity, TargetModel } from "../@types";

export const ROLE_TEMPLATES: Record<PromptCategory, string> = {
     coding:
          'You are a senior software engineer with deep expertise in clean code, architecture, and best practices.',
     writing:
          'You are a professional content writer with expertise in clear, engaging, and persuasive communication.',
     analysis:
          'You are a data analyst specializing in extracting actionable insights and presenting findings clearly.',
     marketing:
          'You are a senior marketing strategist with expertise in digital marketing, copywriting, and conversion optimization.',
     general:
          'You are a helpful and knowledgeable assistant.',
};

export const BASE_CONSTRAINTS: string[] = [
     'Do NOT include unnecessary filler or preamble.',
     'Be specific and actionable.',
];

export const CATEGORY_CONSTRAINTS: Record<PromptCategory, string[]> = {
     coding: [
          'Do NOT use `any` type.',
          'Use strict TypeScript.',
          'Handle edge cases.',
          'No deprecated APIs.',
          'No unnecessary comments.',
     ],
     writing: [
          'Do NOT use clichés or generic phrases.',
          'Match the specified tone consistently.',
          'Keep paragraphs concise.',
          'Vary sentence structure.',
     ],
     analysis: [
          'Support claims with data.',
          'Present findings objectively.',
          'Include methodology if applicable.',
          'Distinguish correlation from causation.',
     ],
     marketing: [
          'Focus on benefits, not features.',
          'Include a clear call to action.',
          'Target the specified audience.',
          'Keep copy scannable.',
     ],
     general: [],
};

export const OUTPUT_FORMATS: Record<PromptCategory, string> = {
     coding:
          'Respond with clean, well-typed code. Include brief inline comments only where logic is non-obvious.',
     writing:
          'Respond with polished prose. Use clear headings if the content has multiple sections.',
     analysis:
          'Respond with a structured analysis. Use sections: Summary, Findings, Recommendations.',
     marketing:
          'Respond with copy ready to publish. Include headline, body, and CTA.',
     general:
          'Respond clearly and concisely. Structure your response logically.',
};

export const MODEL_FORMAT_SUFFIX: Record<TargetModel, string> = {
     claude: '\nWrap code blocks in appropriate language tags.',
     gpt: '\nUse markdown formatting.',
     general: '',
};

export const SPECIFICITY_MAP: Array<[RegExp, string]> = [
     [/\bgood\b/gi, 'high-quality, production-ready'],
     [/\bnice\b/gi, 'well-structured'],
     [/\bsimple\b/gi, 'concise and maintainable'],
     [/\bsome\b/gi, 'specific'],
     [/\bstuff\b/gi, 'components'],
     [/\bthing(s)?\b/gi, 'element$1'],
     [/\betc\.?\b/gi, ''],
     [/\bbasic\b/gi, 'foundational'],
     [/\bcool\b/gi, 'effective'],
     [/\bquick\b/gi, 'efficient'],
     [/\bbetter\b/gi, 'improved and optimized'],
     [/\bhelp\s+me\s+with\b/gi, 'provide a detailed solution for'],
     [/\bI\s+need\b/gi, 'the requirement is'],
     [/\ba\s+lot\b/gi, 'a substantial number of'],
     [/\bvery\b/gi, 'highly'],
     [/\breally\b/gi, 'genuinely'],
     [/\bkind\s+of\b/gi, 'approximately'],
     [/\bsort\s+of\b/gi, 'somewhat'],
     [/\bmaybe\b/gi, 'optionally'],
     [/\bpretty\b/gi, 'reasonably'],
     [/\bfair(ly)?\b/gi, 'reasonably'],
     [/\bhard\b/gi, 'challenging'],
     [/\bfast\b/gi, 'performant'],
     [/\bold\b/gi, 'legacy'],
     [/\bnew\b/gi, 'modern'],
];

export const QUALITY_MARKERS: Record<PromptCategory | 'default', string> = {
     coding:
          'Ensure: type safety, error handling, edge cases covered, no unnecessary comments.',
     writing:
          'Ensure: consistent tone, no clichés, clear flow between paragraphs, strong opening and closing.',
     analysis:
          'Ensure: claims backed by evidence, findings are objective, methodology is transparent, conclusions are actionable.',
     marketing:
          'Ensure: benefit-led copy, single clear CTA, audience-specific language, scannable structure.',
     general:
          'Ensure: accuracy, clarity, logical structure, no filler content.',
     default:
          'Ensure: accuracy, clarity, logical structure, no filler content.',
};

export const CONTEXT_TEMPLATES: Record<PromptCategory, string> = {
     coding:
          'Consider the target environment, language version, existing codebase conventions, and any relevant dependencies or constraints.',
     writing:
          'Consider the target audience, publication platform, desired tone (formal/casual/persuasive), and any brand voice guidelines.',
     analysis:
          'Consider the data source, time range, relevant metrics, business context, and the audience who will act on these findings.',
     marketing:
          'Consider the product/service being promoted, target customer persona, stage in the funnel (awareness/consideration/conversion), and key differentiators.',
     general:
          'Consider relevant background information, constraints, and any prior context that shapes the expected response.',
};

export const TASK_STRUCTURE_TEMPLATES: Record<PromptCategory, string> = {
     coding:
          'Break the task into: (1) requirements and constraints, (2) design/approach, (3) implementation, (4) tests or validation.',
     writing:
          'Structure the task as: (1) objective and audience, (2) key messages or arguments, (3) desired tone and length, (4) any sections or headings required.',
     analysis:
          'Structure the task as: (1) question or hypothesis, (2) data or inputs available, (3) analytical approach, (4) expected output format.',
     marketing:
          'Structure the task as: (1) product/offer details, (2) target audience, (3) channel and format, (4) desired action from the reader.',
     general:
          'Clearly state: (1) what you need, (2) any relevant context or constraints, (3) the expected output format.',
};

export const COMPLEXITY_MODIFIERS: Record<PromptComplexity, string> = {
     simple:
          'Keep the response focused and concise. Avoid over-engineering or unnecessary depth.',
     medium:
          'Provide a thorough response with appropriate detail. Include reasoning where it adds value.',
     complex:
          'Provide a comprehensive, structured response. Break down sub-problems, justify decisions, and consider edge cases or trade-offs.',
};
