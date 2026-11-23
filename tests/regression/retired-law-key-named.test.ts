/**
 * #558 — a config that still names a removed law was told "unknown law …
 * check the name", which reads like a typo. Config Integrity Guard now says
 * what happened and what to do, for the name and the slug, in laws.enabled
 * and laws.severity. Its severity is unchanged: the key still gates nothing,
 * so it is still a finding.
 */
import { ConfigIntegrityGuardLaw } from '../../src/checkers/meta-gate-laws/config-integrity-guard';
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
