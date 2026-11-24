/**
 * #601 — TODO Management: the excess-TODO deduction is measured against the
 * configured limit (thresholds.documentation.maxTodoCount), not a fixed 30.
 *
 * Before, a limit below 30 with a TODO count between the limit and 30 made
 * the deduction negative: the law reported "20 TODOs found (limit: 10)" and
 * a score above 100. Above 30 TODOs the deduction ignored the limit.
 */
import * as fs from 'fs';
import * as path from 'path';

import { TodoManagementLaw } from '../../src/laws/documentation/todo-management';
import type { LawCheckContext } from '../../src/types/law.types';
import { makeTempDir } from '../helpers/temp-dirs';

/** A project with `count` properly formatted TODOs in one source file. */
function projectWithTodos(count: number): string {
  const root = makeTempDir('roc-601-');
  fs.writeFileSync(path.join(root, 'package.json'), '{"name":"fixture"}\n');
  fs.mkdirSync(path.join(root, 'src'));
  const lines = Array.from(
    { length: count },
    (_, i) => `// TODO (Sprint 1): handle case ${i + 1} in the parser`
  );
  lines.push('export const answer = 42;', '');
  fs.writeFileSync(path.join(root, 'src', 'a.ts'), lines.join('\n'));
  return root;
}

async function score(count: number, maxTodoCount?: number) {
  const root = projectWithTodos(count);
  const context = {
    projectRoot: root,
    config: {
      project: { name: 't', root, componentPrefix: 'app', type: 'node' },
      ignores: { global: [], tests: [], build: [], design: [] },
      laws: { paretoMode: false, severity: {} },
      hooks: { preCommit: false, prePush: false, commitMsg: false },
      includes: { global: [] },
      ...(maxTodoCount === undefined
        ? {}
        : { thresholds: { documentation: { maxTodoCount } } }),
    },
  } as unknown as LawCheckContext;
  const result = await TodoManagementLaw.check(context);
  return { score: result.score, violations: result.violations ?? [] };
}

describe('#601 the excess-TODO deduction uses the configured limit', () => {
  it('red before #601: 20 TODOs over a limit of 10 never score above 100', async () => {
    const r = await score(20, 10);

    expect(r.violations).toContain('20 TODOs found (limit: 10)');
    expect(r.score).toBeLessThanOrEqual(100);
  });

  it('red before #601: over a limit of 10, the score is below the same count under the default limit', async () => {
    const strict = await score(20, 10);
    const lenient = await score(20);

    expect(lenient.violations.some(v => /TODOs found/.test(v))).toBe(false);
    expect(strict.score).toBeLessThan(lenient.score);
  });

  it('red before #601: a limit of 20 costs less than a limit of 10 for the same excess count', async () => {
    const limit10 = await score(25, 10);
    const limit20 = await score(25, 20);

    expect(limit10.score).toBeLessThan(limit20.score);
    expect(limit20.score).toBeLessThanOrEqual(100);
  });

  it('red before #601: above 30 TODOs a limit of 10 costs more than the default', async () => {
    const limit10 = await score(45, 10);
    const byDefault = await score(45);

    expect(limit10.score).toBeLessThan(byDefault.score);
  });

  it('control: the default limit costs what it did (45 TODOs over 30)', async () => {
    const byDefault = await score(45);
    const atLimit = await score(30);

    expect(byDefault.violations).toContain('45 TODOs found (limit: 30)');
    // 15 over 30 is half the allowance: half of the 40-point maximum.
    expect(atLimit.score - byDefault.score).toBe(20);
  });

  it('a limit of 0 or below does not divide by it: any TODO costs the maximum', async () => {
    const zero = await score(1, 0);
    const none = await score(0, 0);

    expect(Number.isFinite(zero.score)).toBe(true);
    expect(zero.violations).toContain('1 TODOs found (limit: 0)');
    expect(zero.score).toBeLessThanOrEqual(none.score - 40);
  });
});
