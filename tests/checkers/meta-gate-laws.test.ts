/**
 * Meta-gate laws 226/227 — the gate of the gate (arch proposal batch 1).
 * Audit Liveness: a collapsed law selection fails the audit.
 * Config Integrity: unknown law keys in config are findings, not silence.
 */
import { AuditLivenessLaw } from '../../src/checkers/meta-gate-laws/audit-liveness';
import { ConfigIntegrityGuardLaw } from '../../src/checkers/meta-gate-laws/config-integrity-guard';
import { FileUtils } from '../../src/utils/file-utils';
import type { LawCheckContext, RuleOfCodeConfig } from '../../src/types';

const ctx = (
  laws: Record<string, unknown>,
  projectType = 'python'
): LawCheckContext => {
  const config = FileUtils.getMinimalDefaultConfig();
  config.project.type = projectType as never;
  Object.assign(config.laws, laws);
  return { projectRoot: process.cwd(), config } as never;
};

describe('226 Audit Liveness Assertion', () => {
  it('fails when the planned count is below the explicit floor', () => {
    const r = AuditLivenessLaw.check(
      ctx({ __plannedLawCount: 12, minLawsChecked: 40 })
    );
    expect(r.passed).toBe(false);
    expect((r.violations ?? [])[0]).toMatch(/only 12 laws/);
    expect((r.violations ?? [])[0]).toMatch(/floor of 40/);
  });

  it('fails below the default 25%-of-applicable floor', () => {
    const r = AuditLivenessLaw.check(ctx({ __plannedLawCount: 3 }));
    expect(r.passed).toBe(false);
  });

  it('passes at or above the floor', () => {
    expect(
      AuditLivenessLaw.check(ctx({ __plannedLawCount: 44, minLawsChecked: 40 }))
        .passed
    ).toBe(true);
    expect(
      AuditLivenessLaw.check(ctx({ __plannedLawCount: 86 })).passed
    ).toBe(true);
  });

  it('passes when no planned count is injected (direct invocation)', () => {
    expect(AuditLivenessLaw.check(ctx({})).passed).toBe(true);
  });
});

describe('227 Config Integrity Guard', () => {
  it('flags unknown keys in severity, notApplicable and enabled', () => {
    const r = ConfigIntegrityGuardLaw.check(
      ctx({
        severity: { 'modul-syze': 'error' },
        notApplicable: { 'No Such Law': 'reason' },
        enabled: { garbage: true },
      })
    );
    expect(r.passed).toBe(false);
    expect(r.violations).toHaveLength(3);
    expect((r.violations ?? []).some(v => /laws\.severity: unknown law 'modul-syze'/.test(v))).toBe(true);
  });

  it('accepts every identity spelling and skips legacy law-N keys', () => {
    const r = ConfigIntegrityGuardLaw.check(
      ctx({
        severity: {
          'Module Size': 'error',
          'module-size': 'error',
          '225': 'error',
          'law-12': 'warning',
        },
        notApplicable: { 'Zero Tolerance Doctrine': 'stack-gated but real' },
      })
    );
    expect(r.passed).toBe(true);
  });

  it('stack-gated laws are known (shared configs stay legal)', () => {
    const r = ConfigIntegrityGuardLaw.check(
      ctx({ severity: { 'NgRx Store Pattern Mandate (SACRED LAW)': 'error' } })
    );
    expect(r.passed).toBe(true);
  });
});
