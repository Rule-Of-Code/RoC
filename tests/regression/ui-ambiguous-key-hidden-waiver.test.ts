import { ConfigIntegrityGuardLaw } from '../../src/checkers/meta-gate-laws/config-integrity-guard';
import { displayModeHeader } from '../../src/cli/audit-command';
import { ModularLawsRegistry } from '../../src/registry/modular-laws-registry';
import { FileUtils } from '../../src/utils';

/**
 * Regression: a downstream consumer, 2026-07-14.
 *
 * We shipped a HIDDEN WAIVER GENERATOR. `legacyId` is not unique — 25 values are
 * shared by 51 laws (20 = "No Explicit Any" AND "Branch Governance Standards") —
 * and `lawIdentityKeys()` offered `String(legacyId)` as a public config key. So
 * `notApplicable: { "20": "…" }` silenced TWO laws while the team believed it had
 * silenced one. A hidden waiver, produced by the tool whose entire purpose is to
 * make waivers visible.
 *
 * And the banner announced "FULL CONSTITUTIONAL COMPLIANCE - 173 LAWS!" — the
 * registry TOTAL — before the config had selected anything. Our own repo ran FIVE
 * laws under that banner.
 */
describe('a downstream consumer: ambiguous keys and the lying banner (v7.10.0)', () => {
  const collidingLegacyId = (): { key: string; count: number } => {
    const counts = new Map<string, number>();
    for (const law of ModularLawsRegistry.getAll()) {
      const key = String(law.legacyId);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const [key, count] = [...counts.entries()].find(([, n]) => n > 1) ?? [];
    return { key: key as string, count: count as number };
  };

  describe('an ambiguous key is refused, never honoured', () => {
    it('the registry still has colliding legacyIds — the hazard is real', () => {
      const { key, count } = collidingLegacyId();

      expect(key).toBeDefined();
      expect(count).toBeGreaterThan(1);
    });

    it('does not drop a single law when notApplicable is keyed by a colliding legacyId', () => {
      const { key } = collidingLegacyId();
      const config = FileUtils.getMinimalDefaultConfig();
      (config.laws as Record<string, unknown>).paretoMode = false;

      const before = ModularLawsRegistry.getEnabled(config).length;

      (config.laws as Record<string, unknown>).notApplicable = {
        [key]: 'the team believes this waives exactly one law',
      };
      const after = ModularLawsRegistry.getEnabled(config).length;

      // Nothing is silenced by an ambiguous key. Not one law, and certainly not two.
      expect(after).toBe(before);
    });

    it('reports the ambiguous key as a violation, so the config fails loudly', () => {
      const { key, count } = collidingLegacyId();
      const config = FileUtils.getMinimalDefaultConfig();
      (config.laws as Record<string, unknown>).notApplicable = {
        [key]: 'waive it',
      };

      const result = ConfigIntegrityGuardLaw.check({
        projectRoot: process.cwd(),
        config,
      });

      expect(result.passed).toBe(false);
      expect(result.violations?.join(' ')).toContain('AMBIGUOUS');
      expect(result.violations?.join(' ')).toContain(String(count));
    });

    it('still honours an unambiguous key (the escape hatch keeps working)', () => {
      const law = ModularLawsRegistry.getAll().find(
        candidate =>
          !candidate.alwaysEnabled &&
          ModularLawsRegistry.unambiguousIdentityKeys(candidate).length > 0
      );
      const key = ModularLawsRegistry.unambiguousIdentityKeys(law!).find(
        candidate => !/^\d+$/.test(candidate)
      );

      const config = FileUtils.getMinimalDefaultConfig();
      (config.laws as Record<string, unknown>).paretoMode = false;
      const before = ModularLawsRegistry.getEnabled(config).length;

      (config.laws as Record<string, unknown>).notApplicable = {
        [key as string]: 'documented reason',
      };
      const after = ModularLawsRegistry.getEnabled(config).length;

      expect(after).toBe(before - 1);
    });
  });

  describe('the banner never announces a scope it has not executed', () => {
    it('prints no law count in full mode', () => {
      const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);

      displayModeHeader('full', false);
      const printed = log.mock.calls.flat().join(' ');
      log.mockRestore();

      // The registry total (173) says nothing about what THIS config will run.
      // Our own repo ran 5 laws under a banner announcing 173.
      expect(printed).not.toMatch(/\b\d{2,}\s*LAWS/i);
      expect(printed).not.toMatch(/\b173\b/);
    });

    it('says out loud that a Pareto run is a subset', () => {
      const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);

      displayModeHeader('fast', true);
      const printed = log.mock.calls.flat().join(' ');
      log.mockRestore();

      expect(printed.toUpperCase()).toContain('SUBSET');
    });
  });
});
