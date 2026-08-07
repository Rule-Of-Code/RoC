/**
 * Law selection must never silently collapse (the v7.5.1 zero-laws P0).
 * Falsy paretoMode values, identity-keyed enabled/notApplicable maps, and the
 * default configs are all pinned here — a drop to an empty/tiny law set is a
 * disarmed gate that still shows green.
 */
import { ModularLawsRegistry } from '../../src/registry/modular-laws-registry';
import { ANGULAR_CONFIG, DEFAULT_CONFIG, REACT_CONFIG } from '../../src/config/types';
import { ConfigFileUtils } from '../../src/utils/config-file-utils';
import type { RuleOfCodeConfig } from '../../src/types';

const ALL = ModularLawsRegistry.getAll().length;

const configWith = (laws: Record<string, unknown>): RuleOfCodeConfig => {
  const config = ConfigFileUtils.getMinimalDefaultConfig();
  (config as { laws: Record<string, unknown> }).laws = {
    paretoMode: false,
    severity: {},
    ...laws,
  };
  return config;
};

describe('law selection fail-closed (falsy matrix)', () => {
  it.each([
    ['false', false],
    ['0', 0],
    ['null', null],
    ['absent', undefined],
  ])('paretoMode=%s selects ALL laws, never an empty set', (_label, value) => {
    const laws = { severity: {} } as Record<string, unknown>;
    if (value !== undefined) laws.paretoMode = value;
    const selected = ModularLawsRegistry.getEnabled(configWith(laws));
    expect(selected.length).toBe(ALL);
  });

  it('paretoMode=true selects the Pareto core plus the always-on meta-gates', () => {
    const selected = ModularLawsRegistry.getEnabled(
      configWith({ paretoMode: true })
    );
    expect(selected.length).toBeGreaterThan(0);
    expect(selected.length).toBeLessThan(ALL);

    // Everything selected is either Pareto core, or a guard no config can drop.
    const substantive = selected.filter(l => !l.alwaysEnabled);
    expect(substantive.length).toBeGreaterThan(0);
    expect(substantive.every(l => l.paretoCore)).toBe(true);
    expect(selected.filter(l => l.alwaysEnabled)).toHaveLength(2);
  });
});

describe('laws.enabled resolves through every law identity', () => {
  it.each([
    ['canonical name', 'Module Size'],
    ['printed slug', 'module-size'],
    ['legacyId', '225'],
  ])('enabled keyed by %s selects the law', (_label, key) => {
    const selected = ModularLawsRegistry.getEnabled(
      configWith({ enabled: { [key]: true } })
    );
    expect(
      selected.filter(l => !l.alwaysEnabled).map(l => l.name)
    ).toEqual(['Module Size']);
  });

  it('a suffix-decorated name matches with and without the parenthetical', () => {
    const sacred = ModularLawsRegistry.getAll().find(l =>
      l.name.endsWith('(SACRED LAW)')
    );
    expect(sacred).toBeDefined();
    const stripped = sacred!.name.replace(/\s*\([^)]*\)\s*$/, '');
    const selected = ModularLawsRegistry.getEnabled(
      configWith({ enabled: { [stripped]: true } })
    );
    expect(
      selected.filter(l => !l.alwaysEnabled).map(l => l.name)
    ).toEqual([sacred!.name]);
  });

  it('an allowlist with no matching keys selects no SUBSTANTIVE law (the audit then refuses)', () => {
    const selected = ModularLawsRegistry.getEnabled(
      configWith({ enabled: { 'law-1': true, garbage: true } })
    );
    // Only the two always-on guards survive — and guards never count as
    // evidence, so the engine still refuses to report compliance (QA-4).
    expect(selected.filter(l => !l.alwaysEnabled)).toHaveLength(0);
    expect(selected.filter(l => l.alwaysEnabled)).toHaveLength(2);
  });
});

describe('laws.notApplicable resolves through every law identity', () => {
  it.each([
    ['canonical name', 'Module Size'],
    ['printed slug', 'module-size'],
    ['legacyId', '225'],
  ])('waiver keyed by %s excludes the law', (_label, key) => {
    const selected = ModularLawsRegistry.getEnabled(
      configWith({ notApplicable: { [key]: 'documented reason' } })
    );
    expect(selected.length).toBe(ALL - 1);
    expect(selected.some(l => l.name === 'Module Size')).toBe(false);
  });
});

describe('default configs never carry a law allowlist', () => {
  it.each([
    ['DEFAULT_CONFIG', DEFAULT_CONFIG],
    ['ANGULAR_CONFIG', ANGULAR_CONFIG],
    ['REACT_CONFIG', REACT_CONFIG],
  ])('%s has no laws.enabled and does not force paretoMode on', (_name, config) => {
    expect(config.laws?.enabled).toBeUndefined();
    expect(config.laws?.paretoMode).toBe(false);
  });

  it('DEFAULT_CONFIG does not whitelist scan paths (empty includes.global)', () => {
    expect(DEFAULT_CONFIG.includes?.global).toEqual([]);
  });

  it('DEFAULT_CONFIG does not enable audit caching (stale PASSED risk)', () => {
    expect(DEFAULT_CONFIG.performance?.cache).toBe(false);
  });

  it('DEFAULT_CONFIG never scans the audit-cache artifact', () => {
    expect(DEFAULT_CONFIG.ignores?.global).toContain('**/.ruleofcode-cache/**');
  });
});
