/**
 * Arch proposal batches 2/3 — Python laws 231, 233–239 + the two enhancements
 * (Centralized Logging python branch, Settings envBoundary mode). Every law
 * ships its own "the law actually catches" red/green proof.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { NoWallClockInDomainLaw } from '../../../src/checkers/python-laws/no-wall-clock-in-domain';
import { NoSilentExceptionSwallowingLaw } from '../../../src/checkers/python-laws/no-silent-exception-swallowing';
import { BanditConfiguredLaw } from '../../../src/checkers/python-laws/bandit-configured';
import { PipAuditConfiguredLaw } from '../../../src/checkers/python-laws/pip-audit-configured';
import { DeclaredConcurrencyBoundariesLaw } from '../../../src/checkers/python-laws/declared-concurrency-boundaries';
import { SeededRandomnessLaw } from '../../../src/checkers/python-laws/seeded-randomness';
import { NoWallClockInTestsLaw } from '../../../src/checkers/python-laws/no-wall-clock-in-tests';
import { FloatToleranceInTestsLaw } from '../../../src/checkers/python-laws/float-tolerance-in-tests';
import { SettingsViaBaseSettingsLaw } from '../../../src/checkers/python-laws/settings-via-base-settings';
import { CentralizedLoggingLaw } from '../../../src/checkers/code-quality-laws/centralized-logging';
import { FileUtils } from '../../../src/utils/file-utils';
import type { LawCheckContext, RuleOfCodeConfig } from '../../../src/types';

const dirs: string[] = [];
function fixture(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-arch23-'));
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

describe('231 No Wall-Clock In Domain', () => {
  it('flags wall-clock reads in domain/application layers', () => {
    const dir = fixture({
      'src/domain/pricing.py': 'import time\nnow = time.time()\n',
      'src/application/uc.py': 'from datetime import datetime\nn = datetime.now(tz=UTC)\n',
    });
    const r = NoWallClockInDomainLaw.check(ctx(dir));
    expect(r.passed).toBe(false);
    expect(r.violations).toHaveLength(2); // even tz-aware now() is ambient in domain
  });

  it('passes adapters/composition root and clockBoundary allowlist', () => {
    const dir = fixture({
      'src/adapters/clock.py': 'import time\nnow = time.time()\n',
      'src/domain/tick.py': 'def step(now):\n    return now\n',
      'src/domain/legacy_clock.py': 'import time\nn = time.time()\n',
    });
    const c = ctx(dir, {
      thresholds: { python: { clockBoundary: ['src/domain/legacy_clock.py'] } },
    } as never);
    expect(NoWallClockInDomainLaw.check(c).passed).toBe(true);
  });
});

describe('233 No Silent Exception Swallowing', () => {
  it('flags typed except with a body of only pass/return', () => {
    const dir = fixture({
      'src/svc.py':
        'def f():\n' +
        '    try:\n        go()\n' +
        '    except TimeoutError:\n        pass\n' +
        '    try:\n        go()\n' +
        '    except Exception:\n        return None\n',
    });
    const r = NoSilentExceptionSwallowingLaw.check(ctx(dir));
    expect(r.passed).toBe(false);
    expect(r.violations).toHaveLength(2);
  });

  it('passes handlers that log or re-raise, and leaves bare except to law 211', () => {
    const dir = fixture({
      'src/ok.py':
        'def f():\n' +
        '    try:\n        go()\n' +
        '    except TimeoutError:\n        logger.warning("timeout")\n' +
        '    try:\n        go()\n' +
        '    except ValueError as e:\n        raise RuntimeError() from e\n' +
        '    try:\n        go()\n' +
        '    except:\n        pass\n', // bare → 211's jurisdiction
    });
    expect(NoSilentExceptionSwallowingLaw.check(ctx(dir)).passed).toBe(true);
  });
});

describe('234 Security Scanner Configured / 235 Dependency Audit Configured', () => {
  it('flag a gate without bandit / pip-audit', () => {
    const dir = fixture({ 'src/a.py': 'x = 1\n' });
    expect(BanditConfiguredLaw.check(ctx(dir)).passed).toBe(false);
    expect(PipAuditConfiguredLaw.check(ctx(dir)).passed).toBe(false);
  });

  it('pass when configured (pyproject / pre-commit)', () => {
    const dir = fixture({
      'pyproject.toml': "[project]\nname='x'\n[tool.bandit]\nskips = []\n",
      '.pre-commit-config.yaml': 'repos:\n  - repo: pip-audit\n',
    });
    expect(BanditConfiguredLaw.check(ctx(dir)).passed).toBe(true);
    expect(PipAuditConfiguredLaw.check(ctx(dir)).passed).toBe(true);
  });
});

describe('236 Declared Concurrency Boundaries', () => {
  it('flags concurrency primitives outside the boundary', () => {
    const dir = fixture({
      'src/svc.py': 'import threading\nt = threading.Thread(target=f)\n',
    });
    const r = DeclaredConcurrencyBoundariesLaw.check(ctx(dir));
    expect(r.passed).toBe(false);
  });

  it('passes primitives inside the declared boundary', () => {
    const dir = fixture({
      'src/engine/writer.py': 'import threading\nlock = threading.Lock()\n',
    });
    const c = ctx(dir, {
      thresholds: { python: { concurrencyBoundary: ['src/engine/**'] } },
    } as never);
    expect(DeclaredConcurrencyBoundariesLaw.check(c).passed).toBe(true);
  });
});

describe('237 Seeded Randomness', () => {
  it('flags ambient randomness in domain, passes injected/adapters', () => {
    const dir = fixture({
      'src/domain/ids.py': 'import uuid\nnew_id = uuid.uuid4()\n',
      'src/adapters/rng.py': 'import random\nr = random.random()\n',
    });
    const r = SeededRandomnessLaw.check(ctx(dir));
    expect(r.passed).toBe(false);
    expect(r.violations).toHaveLength(1);
    expect((r.violations ?? [])[0]).toMatch(/domain/);
  });
});

describe('238 No Wall-Clock In Tests', () => {
  it('flags wall-clock in tests, exempts frozen-time files', () => {
    const dir = fixture({
      'tests/test_hot.py': 'import time\ndef test_x():\n    assert time.time() > 0\n',
      'tests/test_frozen.py':
        'from freezegun import freeze_time\nimport time\ndef test_y():\n    assert time.time() > 0\n',
    });
    const r = NoWallClockInTestsLaw.check(ctx(dir));
    expect(r.passed).toBe(false);
    expect(r.violations).toHaveLength(1);
    expect((r.violations ?? [])[0]).toMatch(/test_hot/);
  });
});

describe('239 Float Equality Tolerance In Tests', () => {
  it('flags bare float equality, passes approx/isclose and ints', () => {
    const dir = fixture({
      'tests/test_f.py':
        'def test_a():\n    assert calc() == 1.23\n' +
        'def test_b():\n    assert calc() == pytest.approx(1.23)\n' +
        'def test_c():\n    assert count() == 3\n',
    });
    const r = FloatToleranceInTestsLaw.check(ctx(dir));
    expect(r.passed).toBe(false);
    expect(r.violations).toHaveLength(1);
  });

  it('exactEqualityIn declares modules where exactness IS the invariant', () => {
    // Money quantised by construction (round(x, 2)) compares exactly —
    // pytest.approx there would hide a one-cent regression (BE, endorsed by QA).
    const dir = fixture({
      'tests/test_money.py': 'def test_pnl():\n    assert pnl_usd() == 12.34\n',
      'tests/test_other.py': 'def test_ratio():\n    assert ratio() == 0.75\n',
    });

    const red = FloatToleranceInTestsLaw.check(ctx(dir));
    expect(red.violations).toHaveLength(2);

    const scoped = FloatToleranceInTestsLaw.check(
      ctx(dir, {
        thresholds: { python: { exactEqualityIn: ['tests/test_money.py'] } },
      } as never)
    );
    // The money module is exempt; the rest of the suite stays under the law.
    expect(scoped.violations).toHaveLength(1);
    expect((scoped.violations ?? [])[0]).toMatch(/test_other/);
  });
});

describe('enhancement: Centralized Logging python branch', () => {
  it('flags print() in source, allows tests/scripts/__main__', () => {
    const dir = fixture({
      'src/svc.py': 'print("debug")\n',
      'scripts/run.py': 'print("cli ok")\n',
      'src/app/__main__.py': 'print("entry ok")\n',
      'tests/test_x.py': 'print("test ok")\n',
    });
    const r = CentralizedLoggingLaw.check(ctx(dir));
    expect(r.passed).toBe(false);
    expect((r.violations ?? []).filter(v => /print\(\)/.test(v))).toHaveLength(1);
    expect((r.violations ?? [])[0]).toMatch(/svc\.py/);
  });
});

describe('enhancement: Settings envBoundary mode (209)', () => {
  it('allows env access in declared composition-root paths', () => {
    const dir = fixture({
      'wsgi.py': 'import os\nport = os.getenv("PORT")\n',
    });
    const red = SettingsViaBaseSettingsLaw.check(ctx(dir));
    expect(red.passed).toBe(false);

    const green = SettingsViaBaseSettingsLaw.check(
      ctx(dir, { thresholds: { python: { envBoundary: ['wsgi.py'] } } } as never)
    );
    expect(green.passed).toBe(true);
  });
});
