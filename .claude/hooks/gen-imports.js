#!/usr/bin/env node
/**
 * PostToolUse hook — Write & Edit
 * Runs `pnpm gen:imports` whenever a TypeScript source file is written or edited,
 * keeping src/gen-import.ts in sync with the latest exports automatically.
 */

let input = '';
process.stdin.on('data', (chunk) => (input += chunk));
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input || '{}');
    const raw = (data.tool_input && data.tool_input.file_path) || '';
    // Normalize Windows backslashes to forward slashes for consistent matching
    const file = raw.replace(/\\/g, '/');

    const isSrcTs = file.includes('/src/') && file.endsWith('.ts');
    const isBarrel = file.includes('gen-import');

    if (isSrcTs && !isBarrel) {
      const { execSync } = require('child_process');
      execSync('pnpm gen:imports', { stdio: 'inherit', cwd: process.cwd() });
    }
  } catch {
    // Never block the tool call — silently exit on any parse or exec error
    process.exit(0);
  }
});
