/**
 * QA-4 (v7.8.0 P0): the meta-gates disabled themselves.
 * Audit Liveness (226) and Config Integrity (227) exist to catch the config
 * mistakes that shrink the law set — so the very config that shrinks it must
 * not be able to remove them. A meta-gate a config can disable is not a gate.
 *
 * QA-5: a law name RoC itself reports must resolve as a config key. Sixteen
 * checkers reported local names (e.g. `semver-compliance` for "Semantic
 * Versioning Standards") that were rejected as unknown laws.
 */
import { ModularLawsRegistry } from '../../src/registry/modular-laws-registry';
import { lawIdentityKeys, slugifyLawName } from '../../src/utils/law-identity';
import { ConfigFileUtils } from '../../src/utils/config-file-utils';
import type { RuleOfCodeConfig } from '../../src/types';

const META_GATES = ['Audit Liveness Assertion', 'Config Integrity Guard'];

const configWith = (laws: Record<string, unknown>): RuleOfCodeConfig => {
  const config = ConfigFileUtils.getMinimalDefaultConfig();
  (config as { laws: Record<string, unknown> }).laws = {
    paretoMode: false,
    severity: {},
    ...laws,
  };
  return config;
};

const selectedNames = (laws: Record<string, unknown>): string[] =>
  ModularLawsRegistry.getEnabled(configWith(laws)).map(l => l.name);

describe('meta-gates cannot be disabled by config (QA-4)', () => {
  it.each(META_GATES)('%s survives paretoMode: true', name => {
    expect(selectedNames({ paretoMode: true })).toContain(name);
  });

  it.each(META_GATES)('%s survives a laws.enabled allowlist', name => {
    expect(selectedNames({ enabled: { 'Module Size': true } })).toContain(name);
  });

  it.each(META_GATES)('%s survives a notApplicable waiver', name => {
    expect(
      selectedNames({ notApplicable: { [name]: 'we would rather not be watched' } })
    ).toContain(name);
  });

  it('an allowlist of one law still runs it plus both guards', () => {
    const selected = selectedNames({ enabled: { 'Module Size': true } });
    expect(selected).toContain('Module Size');
    expect(selected).toHaveLength(1 + META_GATES.length);
  });

  it('paretoMode selects the Pareto core plus both guards', () => {
    const pareto = ModularLawsRegistry.getEnabled(
      configWith({ paretoMode: true })
    );
    const core = pareto.filter(l => !l.alwaysEnabled);
    expect(core.every(l => l.paretoCore)).toBe(true);
    expect(pareto.filter(l => l.alwaysEnabled).map(l => l.name).sort()).toEqual(
      [...META_GATES].sort()
    );
  });

  it('only the two guards are marked alwaysEnabled — this is not a loophole', () => {
    const always = ModularLawsRegistry.getAll()
      .filter(l => l.alwaysEnabled)
      .map(l => l.name)
      .sort();
    expect(always).toEqual([...META_GATES].sort());
  });
});

describe('every reported law name resolves as a config key (QA-5)', () => {
  it.each(ModularLawsRegistry.getAll().map(l => [l.name, l] as const))(
    '%s',
    (_name, law) => {
      // The engine reports the canonical slug for every law; a consumer keying
      // laws.severity by what the audit printed must gate, not silently no-op.
      const reported = slugifyLawName(law.name);
      expect(lawIdentityKeys(law)).toContain(reported);
    }
  );
});
