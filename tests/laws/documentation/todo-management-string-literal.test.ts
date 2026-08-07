/**
 * Regression: a TODO marker that appears only inside a string/template literal
 * (a captured or display string showing what a TODO looks like) must NOT be
 * counted as a real TODO. Reported by the site consumer (a `// TODO` inside a
 * display string in law-card.ts was flagged though the file had no real TODO).
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { TodoManagementLaw } from '../../../src/laws/documentation/todo-management';
import type { LawCheckContext, RuleOfCodeConfig } from '../../../src/types';

const config = {
  project: { name: 't', root: '', type: 'generic' },
  ignores: { global: [], tests: [], build: [], design: [] },
  laws: { paretoMode: false, severity: {} },
  hooks: { preCommit: false, prePush: false, commitMsg: false },
  includes: { global: [] },
  excludes: {},
  reporting: { format: 'console', verbose: false, onlyFailures: false, scoring: false },
  performance: { parallel: false, maxConcurrent: 3, cache: true },
} as unknown as RuleOfCodeConfig;

function fixture(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-todo-'));
  for (const [rel, content] of Object.entries(files)) {
    const p = path.join(dir, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content);
  }
  return dir;
}
const ctx = (dir: string): LawCheckContext => ({ projectRoot: dir, config });

describe('TODO Management — string-literal markers are not real TODOs', () => {
  it('does not count a // TODO that lives inside a display string', async () => {
    const dir = fixture({
      'src/law-card.ts': 'export const EXAMPLE = "never a // TODO look";\n',
    });

    const result = await TodoManagementLaw.check(ctx(dir));

    // No real TODO in the file → the law passes (the string marker is ignored).
    expect(result.passed).toBe(true);
  });

  it('still counts a real // TODO comment', async () => {
    const dir = fixture({
      'src/work.ts':
        'export const EXAMPLE = "never a // TODO look";\n// TODO: a genuinely unformatted one\n',
    });

    const result = await TodoManagementLaw.check(ctx(dir));

    // The real marker (unformatted, no sprint reference) is detected and flagged.
    expect(result.passed).toBe(false);
  });
});
