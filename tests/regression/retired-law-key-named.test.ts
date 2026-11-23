/**
 * #558 — a config that still names a removed law was told "unknown law …
 * check the name", which reads like a typo. Config Integrity Guard now says
 * what happened and what to do, for the name and the slug, in laws.enabled
 * and laws.severity. Its severity is unchanged: the key still gates nothing,
 * so it is still a finding.
 */
import { ConfigIntegrityGuardLaw } from '../../src/checkers/meta-gate-laws/config-integrity-guard';
import { RuleOfCodeAuditor } from '../../src/core/auditing/audit-engine';
import { FileUtils } from '../../src/utils/file-utils';

const guard = (laws: Record<string, unknown>): string[] => {
  const config = FileUtils.getMinimalDefaultConfig();
  config.laws = { ...config.laws, ...laws } as typeof config.laws;
  return (
    ConfigIntegrityGuardLaw.check({ projectRoot: process.cwd(), config })
      .violations ?? []
  );
};

describe('#558 a removed law is named as removed, with what to do', () => {
  it.each([
    ['severity', 'No Risk Literals', 'warning'],
    ['severity', 'no-risk-literals', 'error'],
    ['enabled', 'No Risk Literals', true],
    ['enabled', 'no-risk-literals', true],
  ])('laws.%s naming %s', (section, key, value) => {
    expect(guard({ [section]: { [key]: value } })).toEqual([
      `laws.${section}: '${key}' is no longer a law (removed after 8.0.1, #558): delete this key`,
    ]);
  });

  /** The controls: a real typo is still "unknown", and a clean config has nothing. */
  it('still calls a misspelt name an unknown law', () => {
    expect(guard({ severity: { 'No Risk Literal': 'warning' } })).toEqual([
      "laws.severity: unknown law 'No Risk Literal' — this entry gates nothing; check the name with 'roc laws --list'",
    ]);
  });

  it('adds nothing to a config that names only existing laws', () => {
    expect(
      guard({ severity: { 'MD Footer Template (MANDATORY)': 'warning' } })
    ).toEqual([]);
  });
});

/**
 * The engine's stderr said "unknown law" for the same key the guard calls
 * removed. One key, one message: both now use retiredLawNotice.
 */
describe('#558 the engine warns about a removed law in the guard words', () => {
  type Validator = {
    config: { laws: Record<string, unknown>; ignores: Record<string, unknown> };
    validateSeverityOverrides: () => void;
  };
  let warnSpy: jest.SpyInstance;
  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });
  afterEach(() => {
    warnSpy.mockRestore();
  });

  const warnings = (
    laws: Record<string, unknown>,
    byRule?: Record<string, string[]>
  ): string[] => {
    const auditor = new RuleOfCodeAuditor(
      {},
      process.cwd()
    ) as unknown as Validator;
    auditor.config.laws = { ...auditor.config.laws, ...laws };
    if (byRule) auditor.config.ignores = { ...auditor.config.ignores, byRule };
    auditor.validateSeverityOverrides();
    return warnSpy.mock.calls.map(call => String(call[0]));
  };

  it('names the title in laws.notApplicable and the slug in laws.severity as removed', () => {
    const found = warnings({
      notApplicable: { 'No Risk Literals': 'not used here' },
      severity: { 'no-risk-literals': 'error' },
    });
    expect(found).toEqual(
      expect.arrayContaining([
        "⚠️  laws.notApplicable: 'No Risk Literals' is no longer a law (removed after 8.0.1, #558): delete this key",
        "⚠️  laws.severity: 'no-risk-literals' is no longer a law (removed after 8.0.1, #558): delete this key",
      ])
    );
    expect(found.join(' ')).not.toContain('unknown law');
  });

  it('names a removed law in ignores.byRule as removed', () => {
    expect(warnings({}, { 'No Risk Literals': ['src/**'] })).toContain(
      "⚠️  ignores.byRule: 'No Risk Literals' is no longer a law (removed after 8.0.1, #558): delete this key"
    );
  });

  /** The control: a misspelt name is still an unknown law. */
  it('still calls a misspelt name an unknown law, not a removed one', () => {
    const found = warnings({
      notApplicable: { 'No Risk Literal': 'not used here' },
      severity: { 'no-risk-literal': 'error' },
    });
    expect(found).toEqual(
      expect.arrayContaining([
        "⚠️  laws.notApplicable: unknown law 'No Risk Literal' — this waives nothing and the law still runs. Check the name with 'roc laws --list'.",
        "⚠️  laws.severity: unknown law 'no-risk-literal' — this override gates nothing. Check the name with 'roc laws --list'.",
      ])
    );
    expect(found.join(' ')).not.toContain('no longer a law');
  });
});
