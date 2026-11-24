/**
 * Regression: a TODO marker that appears only inside a string/template literal
 * (a captured or display string showing what a TODO looks like) must NOT be
 * counted as a real TODO. Reported by the site consumer (a `// TODO` inside a
 * display string in law-card.ts was flagged though the file had no real TODO).
 */
import fs from 'fs';
import path from 'path';
import { TODO_RULES } from '../../../src/laws/documentation/documentation-penalties';
import { TodoManagementLaw } from '../../../src/laws/documentation/todo-management';
import type { LawCheckContext, RuleOfCodeConfig } from '../../../src/types';
import { makeTempDir } from '../../helpers/temp-dirs';

const config = {
  project: { name: 't', root: '', type: 'generic' },
  ignores: { global: [], tests: [], build: [], design: [] },
  laws: { paretoMode: false, severity: {} },
  hooks: { preCommit: false, prePush: false, commitMsg: false },
  includes: { global: [] },
  excludes: {},
  reporting: {
    format: 'console',
    verbose: false,
    onlyFailures: false,
    scoring: false,
  },
  performance: { parallel: false, maxConcurrent: 3, cache: true },
} as unknown as RuleOfCodeConfig;

function fixture(files: Record<string, string>): string {
  const dir = makeTempDir('roc-todo-');
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

/**
 * The excess deduction was computed inline as
 * min(40, ((count - 30) / 30) * 40); it moved to TODO_RULES.excessPenalty.
 * At the default allowance it gives the same points at the allowance, past
 * it and at the cap; a configured allowance is the base it is measured
 * against (#601).
 */
describe('TODO Management — the excess deduction, at the limit and beyond', () => {
  const inline = (count: number): number =>
    Math.min(40, ((count - 30) / 30) * 40);
  const atDefault = (count: number): number =>
    TODO_RULES.excessPenalty(count, TODO_RULES.defaultMax);

  it.each([30, 31, 45, 59, 60, 61, 200])('%i TODOs', count => {
    expect(atDefault(count)).toBe(inline(count));
  });

  it('is measured against a configured allowance, never negative (#601)', () => {
    expect(TODO_RULES.excessPenalty(15, 10)).toBe(20);
    expect(TODO_RULES.excessPenalty(20, 10)).toBe(40);
    expect(TODO_RULES.excessPenalty(25, 20)).toBe(10);
    expect(TODO_RULES.excessPenalty(10, 20)).toBe(0);
    expect(TODO_RULES.excessPenalty(1, 0)).toBe(40);
  });

  it('is zero at the default allowance and capped at the max', () => {
    expect(atDefault(TODO_RULES.defaultMax)).toBe(0);
    expect(atDefault(1000)).toBe(40);
    expect(TODO_RULES.minFormatted).toBe(80);
    expect(TODO_RULES.weekMs).toBe(604800000);
  });
});
