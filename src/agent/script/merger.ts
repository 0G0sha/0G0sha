export class Merger {

     public merge(current: string, learned: string): string {
          const currentSections = this.extractSections(current);
          const learnedSections = this.extractSections(learned);

          let merged = current;

          for (const [label, content] of Object.entries(learnedSections)) {
               if (!currentSections[label]) {
                    merged += `\n\n${content}`;
               }
          }

          return merged;
     }

     private extractSections(text: string): Record<string, string> {
          const sections: Record<string, string> = {};

          const xmlRe = /<(\w+)>([\s\S]*?)<\/\1>/g;
          let match: RegExpExecArray | null;
          while ((match = xmlRe.exec(text)) !== null) {
               sections[match[1].toLowerCase()] = match[0];
          }

          // Markdown: ## Tag\ncontent (until next ## or [ or end)
          const mdRe = /^(## (\w+)\n[\s\S]*?)(?=\n## |\n\[|$)/gm;
          while ((match = mdRe.exec(text)) !== null) {
               sections[match[2].toLowerCase()] = match[1];
          }

          const brRe = /^(\[([A-Z_]+)\]\n[\s\S]*?)(?=\n\[|$)/gm;
          while ((match = brRe.exec(text)) !== null) {
               sections[match[2].toLowerCase()] = match[1];
          }
          return sections;
     }
}
