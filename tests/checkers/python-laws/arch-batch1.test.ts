/**
 * Arch proposal batch 1 (an early adopter, 2026-07) — Python P0 laws 228/229/230.
 * Every law ships with its own "the law actually catches" red/green proof
 * (doctrine lesson from v7.5.1: a green exit alone proves nothing).
 * Real temp fixtures, no mocks.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { TimezoneAwareDatetimesLaw } from '../../../src/checkers/python-laws/timezone-aware-datetimes';
import { NoAssertGuardsLaw } from '../../../src/checkers/python-laws/no-assert-guards';
import { StrictExpectedFailuresLaw } from '../../../src/checkers/python-laws/strict-expected-failures';
import { FileUtils } from '../../../src/utils/file-utils';
import type { LawCheckContext, RuleOfCodeConfig } from '../../../src/types';

const dirs: string[] = [];
function fixture(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-arch1-'));
  dirs.push(dir);
  const all = { 'pyproject.toml': "[project]\nname='x'\n", ...files };
  for (const [name, content] of Object.entries(all)) {
    const p = path.join(dir, name);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content);
  }
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
  config.project.type = 'python';
  if (extra) Object.assign(config, extra);
  return { projectRoot: root, config } as never;
};

describe('228 Timezone-Aware Datetimes', () => {
  it('flags naive datetime.now(), utcnow() and date.today() with line numbers', () => {
    const dir = fixture({
      'src/clock.py':
        'from datetime import datetime, date\n' +
        'a = datetime.now()\n' +
        'b = datetime.utcnow()\n' +
        'c = date.today()\n',
    });
    const r = TimezoneAwareDatetimesLaw.check(ctx(dir));
    expect(r.passed).toBe(false);
    expect(r.violations).toHaveLength(3);
    expect((r.violations ?? []).some(v => /clock\.py:2/.test(v))).toBe(true);
  });

  it('passes tz-aware construction and ignores strings/comments', () => {
    const dir = fixture({
      'src/ok.py':
        'from datetime import datetime, timezone\n' +
        'a = datetime.now(timezone.utc)\n' +
        'b = datetime.now(tz=UTC)\n' +
        '# datetime.now() in a comment\n' +
        's = "datetime.utcnow()"\n',
    });
    expect(TimezoneAwareDatetimesLaw.check(ctx(dir)).passed).toBe(true);
  });

  it('excludes test files and honours allowNaiveIn', () => {
    const dir = fixture({
      'tests/test_x.py': 'from datetime import datetime\na = datetime.now()\n',
      'tools/local.py': 'from datetime import datetime\na = datetime.now()\n',
    });
    const c = ctx(dir, {
      thresholds: { python: { allowNaiveIn: ['tools/**'] } },
    } as never);
    expect(TimezoneAwareDatetimesLaw.check(c).passed).toBe(true);
  });
});

describe('229 No Assert Guards In Production', () => {
  it('flags assert statements in source', () => {
    const dir = fixture({
      'src/guard.py': 'def f(x):\n    assert x > 0, "must be positive"\n    return x\n',
    });
    const r = NoAssertGuardsLaw.check(ctx(dir));
    expect(r.passed).toBe(false);
    expect((r.violations ?? [])[0]).toMatch(/guard\.py:2/);
  });

  it('passes asserts in tests, explicit raises in source, and allowlisted paths', () => {
    const dir = fixture({
      'tests/test_g.py': 'def test_f():\n    assert f(1) == 1\n',
      'src/ok.py': 'def f(x):\n    if x <= 0:\n        raise ValueError("must be positive")\n    return x\n',
      'src/narrow.py': 'def g(x):\n    assert isinstance(x, int)\n    return x\n',
    });
    const c = ctx(dir, {
      thresholds: { python: { allowAssertIn: ['src/narrow.py'] } },
    } as never);
    expect(NoAssertGuardsLaw.check(c).passed).toBe(true);
  });
});

describe('230 Strict Expected Failures', () => {
  it('flags xfail without strict=True and markers without reason=', () => {
    const dir = fixture({
      'tests/test_x.py':
        'import pytest\n' +
        '@pytest.mark.xfail(reason="known bug")\n' +
        'def test_a(): ...\n' +
        '@pytest.mark.skip\n' +
        'def test_b(): ...\n' +
        '@pytest.mark.skipif(True, reason="env")\n' +
        'def test_c(): ...\n',
    });
    const r = StrictExpectedFailuresLaw.check(ctx(dir));
    expect(r.passed).toBe(false);
    // xfail: has reason but no strict → 1; skip: no reason → 1; skipif has reason → 0
    expect(r.violations).toHaveLength(2);
    expect((r.violations ?? []).some(v => /xfail without strict=True/.test(v))).toBe(true);
    expect((r.violations ?? []).some(v => /mark\.skip without reason=/.test(v))).toBe(true);
  });

  it('passes strict, reasoned markers (incl. multi-line args) and ignores source files', () => {
    const dir = fixture({
      'tests/test_ok.py':
        'import pytest\n' +
        '@pytest.mark.xfail(\n    reason="forward golden",\n    strict=True,\n)\n' +
        'def test_a(): ...\n' +
        '@pytest.mark.skipif(True, reason="ci only")\n' +
        'def test_b(): ...\n',
      'src/mark.py': 'class mark:\n    xfail = None\n',
    });
    expect(StrictExpectedFailuresLaw.check(ctx(dir)).passed).toBe(true);
  });
});
