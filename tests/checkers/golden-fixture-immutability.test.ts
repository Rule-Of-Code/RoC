/**
 * 232 Golden Fixture Immutability — a golden change without a
 * GOLDEN-APPROVALS.md entry in the same change-set fails; with the entry it
 * passes; without declared goldenPaths the law is dormant. Real git fixtures.
 */
import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { GoldenFixtureImmutabilityLaw } from '../../src/checkers/meta-gate-laws/golden-fixture-immutability';
import { FileUtils } from '../../src/utils/file-utils';
import type { LawCheckContext, RuleOfCodeConfig } from '../../src/types';

const dirs: string[] = [];
function gitFixture(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-golden-'));
  dirs.push(dir);
  const git = (cmd: string): void => {
    execSync(cmd, { cwd: dir, stdio: 'pipe' });
  };
  git('git init -q');
  git('git config user.email roc@test.local');
  git('git config user.name roc-test');
  fs.mkdirSync(path.join(dir, 'tests/golden'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'tests/golden/day1.json'), '{"pnl": 1}\n');
  fs.writeFileSync(path.join(dir, 'src.py'), 'x = 1\n');
  git('git add -A');
  git('git commit -q -m base');
  return dir;
}
afterAll(() => {
  for (const dir of dirs) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* best effort */
    }
  }
});
const ctx = (root: string, extra?: Partial<RuleOfCodeConfig>): LawCheckContext => {
  const config = FileUtils.getMinimalDefaultConfig();
  if (extra) Object.assign(config, extra);
  return { projectRoot: root, config } as never;
};

describe('232 Golden Fixture Immutability', () => {
  jest.setTimeout(30000);

  it('fails a golden change without an approvals entry in the change-set', () => {
    const dir = gitFixture();
    fs.writeFileSync(path.join(dir, 'tests/golden/day1.json'), '{"pnl": 2}\n');
    const r = GoldenFixtureImmutabilityLaw.check(
      ctx(dir, { goldenPaths: ['tests/golden/**'] })
    );
    expect(r.passed).toBe(false);
    expect((r.violations ?? [])[0]).toMatch(/day1\.json/);
  });

  it('passes when GOLDEN-APPROVALS.md is touched in the same change-set', () => {
    const dir = gitFixture();
    fs.writeFileSync(path.join(dir, 'tests/golden/day1.json'), '{"pnl": 2}\n');
    fs.writeFileSync(
      path.join(dir, 'GOLDEN-APPROVALS.md'),
      '- tests/golden/day1.json: fee model change, approved by Quant, 2026-07-11\n'
    );
    const r = GoldenFixtureImmutabilityLaw.check(
      ctx(dir, { goldenPaths: ['tests/golden/**'] })
    );
    expect(r.passed).toBe(true);
  });

  it('ignores non-golden changes and is dormant without goldenPaths', () => {
    const dir = gitFixture();
    fs.writeFileSync(path.join(dir, 'src.py'), 'x = 2\n');
    expect(
      GoldenFixtureImmutabilityLaw.check(
        ctx(dir, { goldenPaths: ['tests/golden/**'] })
      ).passed
    ).toBe(true);

    fs.writeFileSync(path.join(dir, 'tests/golden/day1.json'), '{"pnl": 3}\n');
    expect(GoldenFixtureImmutabilityLaw.check(ctx(dir)).passed).toBe(true);
  });
});
