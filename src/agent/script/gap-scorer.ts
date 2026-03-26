import { PromptElement, PromptGap, ElementDetector } from "../@types";

const DETECTORS: ElementDetector[] = [
     {
          element: 'role',
          strongPatterns: [
               /you are (a|an)/i, /you're (a|an)/i, /act as (a|an)/i, /your role is/i,
               /as (a|an) (senior|expert|professional)/i,
               /assume the role of/i, /respond as (a|an)/i, /speak as (a|an)/i,
               /imagine you (are|'re) (a|an)/i, /behave as (a|an)/i,
               /take on the role of/i,
          ],
          weakPatterns: [/like (a|an)/i, /pretend/i, /be (a|an)/i, /think like/i],
     },
     {
          element: 'context',
          strongPatterns: [
               /context:/i, /background:/i, /given that/i, /the situation is/i,
               /i('m| am) (working on|building|creating|developing)/i,
               /my (project|app|application|system|tool)/i,
               /use case:/i, /scenario:/i, /we are (building|creating|developing)/i,
               /our (team|company|organization)/i, /in the context of/i,
               /the purpose is/i, /this is for/i,
          ],
          weakPatterns: [/about/i, /regarding/i, /currently/i, /at the moment/i],
     },
     {
          element: 'task',
          strongPatterns: [
               /your task is/i, /please (create|write|build|generate|make|implement|design|analyze|explain|summarize|review|debug|refactor)/i,
               /i need you to/i, /i want you to/i, /i('d| would) like you to/i,
               /help me (create|write|build|generate|make|implement|design|analyze|explain|summarize|review|debug|refactor)/i,
               /can you (create|write|build|generate|make|implement|design|analyze|explain|summarize|review|debug|refactor)/i,
               /could you (create|write|build|generate|make|implement|design|analyze|explain|summarize|review|debug|refactor)/i,
               /^(analyze|explain|summarize|review|debug|refactor|create|write|build|generate|implement|design)/i,
          ],
          weakPatterns: [/(create|write|build|make|do)/i, /(optimize|fix|improve)/i],
     },
     {
          element: 'constraints',
          strongPatterns: [
               /do not|don't|must not|never/i, /constraints?:/i, /rules?:/i,
               /requirements?:/i, /must (be|have|include|follow)/i,
               /limit(ed)? to/i, /maximum|minimum|at (most|least)/i,
               /only use/i, /without using/i, /no (more|less) than/i,
               /restricted to/i, /stay within/i,
               /in \d+ (words?|characters?|lines?)/i,
          ],
          weakPatterns: [/avoid/i, /keep it/i, /make sure/i, /preferably/i, /if possible/i],
     },
     {
          element: 'outputFormat',
          strongPatterns: [
               /output format:/i, /respond (in|with|using) (json|markdown|html|xml|yaml|csv)/i,
               /format (as|like|in)/i, /return (a|the) (json|list|table|array|object)/i,
               /structured (as|output)/i, /step.by.step/i,
               /numbered (steps?|list)/i, /use (bullet|numbered) (points?|list)/i,
               /as (a )?(report|summary|paragraph|essay)/i, /in plain text/i,
               /use (headers?|sections?)/i,
          ],
          weakPatterns: [/json/i, /markdown/i, /bullet points?/i, /table/i, /code (block|snippet)/i, /briefly|concisely|in detail/i],
     },
     {
          element: 'examples',
          strongPatterns: [
               /example:/i, /for example/i, /e\.g\./i, /such as/i,
               /input:[\s\S]+output:/i, /here('s| is) (an|a) example/i,
               /here are (some )?examples/i, /sample (input|output)/i,
               /to illustrate/i, /as follows:/i, /consider this:/i,
          ],
          weakPatterns: [/like this/i, /something like/i, /for instance/i, /\bsay,/i],
     },
];

const ELEMENT_WEIGHTS: Record<PromptElement, number> = {
     role: 1.5,
     context: 2,
     task: 2.5,
     constraints: 1.5,
     outputFormat: 1.5,
     examples: 1,
};

function check(text: string, detector: ElementDetector): PromptGap['severity'] {
     for (const p of detector.strongPatterns) {
          if (p.test(text)) return 'ok';
     }
     for (const p of detector.weakPatterns) {
          if (p.test(text)) return 'weak';
     }
     return 'missing';
}

export function detect(text: string): PromptGap[] {
     return DETECTORS.map((d) => ({
          element: d.element,
          severity: check(text, d),
     }));
}

export function calcRawScore(gaps: PromptGap[]): number {
     const maxScore = Object.values(ELEMENT_WEIGHTS).reduce((a, b) => a + b, 0);
     let score = 0;

     for (const gap of gaps) {
          if (gap.severity === 'ok') score += ELEMENT_WEIGHTS[gap.element];
          if (gap.severity === 'weak') score += ELEMENT_WEIGHTS[gap.element] * 0.5;
     }

     return Math.round((score / maxScore) * 10);
}
