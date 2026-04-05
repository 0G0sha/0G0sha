import { AnalysisResult, LearnedWeight, TargetModel, TransformRule } from "../@types";

const QUALITY_MARKERS: Record<string, string> = {
     coding:
          'Ensure: type safety, error handling, edge cases covered, no unnecessary comments.',
     default:
          'Ensure: accuracy, clarity, logical structure, no filler content.',
};

const findRoleEnd = (text: string): number => {
     const xmlEnd = text.indexOf('</role>');
     if (xmlEnd !== -1) return xmlEnd + '</role>'.length;

     const mdMatch = text.match(/^## Role\n[\s\S]*?\n\n/m);
     if (mdMatch) return (mdMatch.index ?? 0) + mdMatch[0].length;

     const brMatch = text.match(/^\[ROLE\]\n[\s\S]*?\n\n/m);
     if (brMatch) return (brMatch.index ?? 0) + brMatch[0].length;

     return -1;
};

const rules: TransformRule[] = [
     {
          id: 'add_role',
          name: 'Add Role',
          element: 'role',
          condition: (a) =>
               a.gaps.some((g) => g.element === 'role' && g.severity !== 'ok'),
          apply: (text, analysis, target) => {
               const role = ROLE_TEMPLATES[analysis.category];
               const wrapped = wrapSection('role', role, target);
               return `${wrapped}\n\n${text}`;
          },
     },
     {
          id: 'add_context',
          name: 'Add Context',
          element: 'context',
          condition: (a) =>
               a.gaps.some((g) => g.element === 'context' && g.severity === 'missing'),
          apply: (text, analysis, target) => {
               const content = `The user needs help with a ${analysis.category} task. Their core intent: ${analysis.intent}.`;
               const wrapped = wrapSection('context', content, target);

               const roleEnd = findRoleEnd(text);
               if (roleEnd !== -1) {
                    const before = text.slice(0, roleEnd);
                    const after = text.slice(roleEnd).trimStart();
                    return `${before}\n\n${wrapped}\n\n${after}`;
               }

               return `${wrapped}\n\n${text}`;
          },
     },
     {
          id: 'structure_task',
          name: 'Structure Task',
          element: 'task',
          condition: (a) =>
               a.gaps.some((g) => g.element === 'task' && g.severity !== 'ok'),
          apply: (text, analysis, target) => {
               // Find the raw user text (strip any already-added sections)
               const rawText = extractRawText(text, target);
               const focusAreas = analysis.keywords.slice(0, 5).join(', ');
               const taskContent = `Your task: ${rawText}\n\nKey focus areas: ${focusAreas}`;
               const wrappedTask = wrapSection('task', taskContent, target);

               // Replace the raw text portion with the structured task block
               if (rawText && text.includes(rawText)) {
                    return text.replace(rawText, wrappedTask);
               }

               return `${text}\n\n${wrappedTask}`;
          },
     },
     {
          id: 'add_constraints',
          name: 'Add Constraints',
          element: 'constraints',
          condition: (a) =>
               a.gaps.some((g) => g.element === 'constraints' && g.severity !== 'ok'),
          apply: (text, analysis, target) => {
               const categorySet = CATEGORY_CONSTRAINTS[analysis.category] ?? [];
               const all = [...BASE_CONSTRAINTS, ...categorySet]
                    .map((c) => `- ${c}`)
                    .join('\n');
               const wrapped = wrapSection('constraints', all, target);
               return `${text}\n\n${wrapped}`;
          },
     },
     {
          id: 'add_output_format',
          name: 'Add Output Format',
          element: 'outputFormat',
          condition: (a) =>
               a.gaps.some((g) => g.element === 'outputFormat' && g.severity !== 'ok'),
          apply: (text, analysis, target) => {
               const base = OUTPUT_FORMATS[analysis.category] ?? OUTPUT_FORMATS.general;
               const suffix = MODEL_FORMAT_SUFFIX[target];
               const wrapped = wrapSection('output_format', `${base}${suffix}`, target);
               return `${text}\n\n${wrapped}`;
          },
     },
     {
          id: 'improve_specificity',
          name: 'Improve Specificity',
          element: 'task',
          condition: (a) => a.complexity === 'simple' && a.rawScore < 5,
          apply: (text) => {
               let result = text;
               for (const [pattern, replacement] of SPECIFICITY_MAP) {
                    result = result.replace(pattern, replacement);
               }
               return result.replace(/ {2,}/g, ' ').trim();
          },
     },
     {
          id: 'add_quality_markers',
          name: 'Add Quality Markers',
          element: 'constraints',
          condition: (a) => a.complexity !== 'simple',
          apply: (text, analysis, target) => {
               const markers =
                    analysis.category === 'coding'
                         ? QUALITY_MARKERS.coding
                         : QUALITY_MARKERS.default;
               const wrapped = wrapSection('quality', markers, target);
               return `${text}\n\n${wrapped}`;
          },
     },
];

const extractRawText = (text: string, target: TargetModel): string => {
     let raw = text;
     switch (target) {
          case 'claude':
               raw = raw.replace(/<\w+>[\s\S]*?<\/\w+>/g, '');
               break;
          case 'gpt':
               raw = raw.replace(/^## \w+[\s\S]*?(?=\n## |$)/gm, '');
               break;
          case 'general':
               raw = raw.replace(/^\[[A-Z_]+\][\s\S]*?(?=\n\[|$)/gm, '');
               break;
     }
     return raw.trim();
};

export class RuleEngine {
     private readonly rules: TransformRule[] = rules;

     public apply(
          text: string,
          analysis: AnalysisResult,
          target: TargetModel,
          weights: LearnedWeight[] = [],
     ): { result: string; appliedRules: string[] } {
          // Build weight lookup
          const weightMap = new Map(weights.map((w) => [w.ruleId, w.weight]));

          // Sort rules by learned weight DESC (highest priority first)
          const sorted = [...this.rules].sort((a, b) => {
               const wa = weightMap.get(a.id) ?? 1.0;
               const wb = weightMap.get(b.id) ?? 1.0;
               return wb - wa;
          });

          let result = text;
          const appliedRules: string[] = [];

          for (const rule of sorted) {
               if (rule.condition(analysis)) {
                    result = rule.apply(result, analysis, target);
                    appliedRules.push(rule.id);
               }
          }

          return { result, appliedRules };
     }

     public getRuleIds(): string[] {
          return this.rules.map((r) => r.id);
     }

     public getRuleCount(): number {
          return this.rules.length;
     }
}
