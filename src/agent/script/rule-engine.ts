import { TransformRule } from "../@types";
import { v4 as uuid } from 'uuid';
import { ROLE_TEMPLATES } from "../data/rules-template";
import { wrapSection } from "./modelAdapter";

const findRoleEnd = (text: string): number => {
     const xmlEnd = text.indexOf('</role>');
     if (xmlEnd !== -1) return xmlEnd + '</role>'.length;

     const mdMatch = text.match(/^## Role\n[\s\S]*?\n\n/m);
     if (mdMatch) return (mdMatch.index ?? 0) + mdMatch[0].length;

     const brMatch = text.match(/^\[ROLE\]\n[\s\S]*?\n\n/m);
     if (brMatch) return (brMatch.index ?? 0) + brMatch[0].length;

     return -1;
};

export const addRules: TransformRule[] = [
     {
          id: uuid(),
          name: "Add Rules",
          element: "role",
          condition: (analysis) => analysis.gaps.some(g => g.element === 'role' && g.severity !== 'ok'),
          apply: (text, analysis, target) => {
               const role = ROLE_TEMPLATES[analysis.category];
               const wrapped = wrapSection('role', role, target);
               return `${wrapped}\n\n${text}`;
          },
     },
     {
          id: uuid(),
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
     }]
