/**
 * Laws Command Tests
 * Tests for cli/laws-command.ts
 *
 * The behaviour tests below exist because the option-registration tests did
 * not: `--category` and `--enabled` were advertised in --help and silently
 * ignored for as long as the command existed, and every test passed. A test
 * that asserts an option is REGISTERED does not assert that it FILTERS.
 */

import { Command } from 'commander';
import { isRuleOfCodePackageName } from '../../src/utils/ruleofcode-package';
import {
  categoryOf,
  LAW_CATEGORIES,
  buildLawsJson,
  displayLaws,
  executeLawsAction,
  filterLaws,
  isKnownCategory,
  lawsCommand,
  populatedCategories,
  serializeLaw,
} from '../../src/cli/laws-command';
import { TOTAL_LAWS_COUNT } from '../../src/cli/utils';
import { ModularLawsRegistry } from '../../src/registry/modular-laws-registry';

/** A category the registry actually populates — filtering is proven against this. */
// The AUTHORED category — the one written next to the law in src/data/*.ts.
// The derived tier (foundational/maintainability/…) is not authored by anyone and
// must never be what a consumer filters by (a downstream consumer).
const REAL_CATEGORY = 'SECURITY';

describe('cli/laws-command', () => {
  describe('lawsCommand', () => {
    let program: Command;

    beforeEach(() => {
      program = new Command();
    });

    it('should register laws command on program', () => {
      lawsCommand(program);

      const cmd = program.commands.find(c => c.name() === 'laws');
      expect(cmd).toBeDefined();
    });

    it('should have correct description', () => {
      lawsCommand(program);

      const cmd = program.commands.find(c => c.name() === 'laws');
      expect(cmd?.description()).toContain('Constitutional Laws');
    });

    it.each([
      ['--list', '-l'],
      ['--enabled', '-e'],
      ['--pareto', '-p'],
      ['--category', '-c'],
      ['--json', undefined],
      ['--config', undefined],
    ])('should expose %s option', (long, short) => {
      lawsCommand(program);

      const cmd = program.commands.find(c => c.name() === 'laws');
      const option = cmd?.options.find(o => o.long === long);
      expect(option).toBeDefined();
      expect(option?.short).toBe(short);
    });
  });

  describe('registry identity', () => {
    it('should derive the advertised law count from the registry, never a literal', () => {
      // The website prints this number. If it could drift from the registry,
      // the site would advertise a law count the tool cannot produce.
      expect(TOTAL_LAWS_COUNT).toBe(ModularLawsRegistry.getAll().length);
    });

    it('should only assign categories the CLI accepts', () => {
      for (const category of populatedCategories()) {
        expect(isKnownCategory(category)).toBe(true);
      }
    });

    it('should keep populated categories a subset of the declared ones', () => {
      // TRIPWIRE. Today the registry derives `category` from a law's priority,
      // not its concern, so `security` and `quality` are declared but carried
      // by zero laws while "API Security Testing" is filed as `performance`.
      // When that taxonomy is fixed, this test fails — and it must, because the
      // website's category filter and every consumer's `--category` script have
      // to be revisited on the same day.
      const populated = populatedCategories();

      // Every populated category must be a declared one: a category the registry
      // carries but the CLI does not accept is a filter the user cannot use.
      for (const category of populated) {
        expect(LAW_CATEGORIES as readonly string[]).toContain(category);
      }
      expect(populated.length).toBeGreaterThan(0);
    });
  });

  describe('filterLaws', () => {
    const allLaws = ModularLawsRegistry.getAll();

    it('should return the whole registry when no filter is given', () => {
      expect(filterLaws(allLaws, {})).toHaveLength(allLaws.length);
    });

    it('should return ONLY laws of the requested category', () => {
      const filtered = filterLaws(allLaws, { category: REAL_CATEGORY });

      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.every(law => categoryOf(law) === REAL_CATEGORY)).toBe(true);
    });

    it('should return FEWER laws than the registry when filtering by category', () => {
      // The bug: --category returned all 173 laws. A filter that returns
      // everything is not a filter, and it reported success while doing it.
      const filtered = filterLaws(allLaws, { category: REAL_CATEGORY });

      expect(filtered.length).toBeLessThan(allLaws.length);
    });

    it('should return ONLY Pareto core laws when --pareto is set', () => {
      const pareto = filterLaws(allLaws, { pareto: true });

      expect(pareto.length).toBeGreaterThan(0);
      expect(pareto.length).toBeLessThan(allLaws.length);
      expect(pareto.every(law => law.paretoCore)).toBe(true);
    });

    it('should compose --pareto and --category', () => {
      const composed = filterLaws(allLaws, {
        pareto: true,
        category: REAL_CATEGORY,
      });

      expect(
        composed.every(law => law.paretoCore && categoryOf(law) === REAL_CATEGORY)
      ).toBe(true);
    });
  });

  describe('executeLawsAction — unknown category fails closed', () => {
    let logSpy: jest.SpyInstance;
    let errorSpy: jest.SpyInstance;

    beforeEach(() => {
      logSpy = jest.spyOn(console, 'log').mockImplementation();
      errorSpy = jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      logSpy.mockRestore();
      errorSpy.mockRestore();
    });

    it('should exit 1 for a category that does not exist', () => {
      expect(executeLawsAction({ category: 'totally-invented' })).toBe(1);
    });

    it('should NOT print any law when the category is unknown', () => {
      executeLawsAction({ category: 'totally-invented' });

      const printed = logSpy.mock.calls.map(c => String(c[0])).join('\n');
      expect(printed).not.toContain('🏛️ Law 1:');
    });

    it('should name the valid categories when refusing', () => {
      executeLawsAction({ category: 'totally-invented' });

      const printed = errorSpy.mock.calls.map(c => String(c[0])).join('\n');
      expect(printed).toContain('Refusing to list laws');
      for (const category of LAW_CATEGORIES) {
        expect(printed).toContain(category);
      }
    });

    it('should exit 0 for every declared category, populated or not', () => {
      for (const category of LAW_CATEGORIES) {
        expect(executeLawsAction({ category })).toBe(0);
      }
    });
  });

  describe('executeLawsAction — an empty category must not read as absent coverage', () => {
    let logSpy: jest.SpyInstance;

    beforeEach(() => {
      logSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      logSpy.mockRestore();
    });

    it('should refuse to let an empty filter read as absent coverage', () => {
      // Since the AUTHORED category is what we filter by, every declared category
      // now carries laws — the old hazard (a declared-but-empty category) is gone.
      // The guard still matters for a VALID filter that legitimately returns zero:
      // printing a bare "0 laws" would be a lie of omission, the exact false
      // confidence this product exists to kill.
      executeLawsAction({ category: 'DOCUMENTATION', pareto: true });

      const printed = logSpy.mock.calls.map(c => String(c[0])).join('\n');
      expect(printed).toContain('0 of');
      expect(printed).toContain('Do not read this as absence of coverage');
      expect(printed).toContain('DOCUMENTATION');
    });

    it('should stay silent about it when the category is populated', () => {
      executeLawsAction({ category: REAL_CATEGORY });

      const printed = logSpy.mock.calls.map(c => String(c[0])).join('\n');
      expect(printed).not.toContain('Do not read this as absence of coverage');
    });
  });

  describe('executeLawsAction — JSON contract', () => {
    let logSpy: jest.SpyInstance;

    beforeEach(() => {
      logSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      logSpy.mockRestore();
    });

    const emittedJson = (): ReturnType<typeof JSON.parse> => {
      // stdout must carry JSON and NOTHING else, or `laws --json | jq` breaks.
      expect(logSpy).toHaveBeenCalledTimes(1);
      return JSON.parse(String(logSpy.mock.calls[0][0]));
    };

    it('should emit parseable JSON on stdout with no banner', () => {
      expect(executeLawsAction({ json: true })).toBe(0);

      const payload = emittedJson();
      expect(isRuleOfCodePackageName(payload.tool)).toBe(true);
      expect(payload.schemaVersion).toBe(2);
    });

    it('should emit every law in the registry when unfiltered', () => {
      executeLawsAction({ json: true });

      const payload = emittedJson();
      expect(payload.laws).toHaveLength(TOTAL_LAWS_COUNT);
      expect(payload.returned).toBe(TOTAL_LAWS_COUNT);
      expect(payload.registryTotal).toBe(TOTAL_LAWS_COUNT);
    });

    it('should keep `returned` honest to the laws actually emitted', () => {
      executeLawsAction({ json: true, category: REAL_CATEGORY });

      const payload = emittedJson();
      expect(payload.returned).toBe(payload.laws.length);
    });

    it('should return FEWER laws than the registry when a filter is applied', () => {
      executeLawsAction({ json: true, category: REAL_CATEGORY });

      const payload = emittedJson();
      expect(payload.returned).toBeLessThan(payload.registryTotal);
      expect(
        payload.laws.every(
          (law: { category: string }) => law.category === REAL_CATEGORY
        )
      ).toBe(true);
    });

    it('should echo back the filters that produced the set', () => {
      // This is what makes a filter regression detectable by a consumer:
      // filters.category set alongside returned === registryTotal is
      // self-evidently a lie, and a script can assert on it.
      executeLawsAction({ json: true, category: REAL_CATEGORY, pareto: true });

      const payload = emittedJson();
      expect(payload.filters).toEqual({
        enabled: false,
        pareto: true,
        category: REAL_CATEGORY,
      });
    });

    it('should publish which categories are actually populated', () => {
      // A consumer that renders a category filter from the declared enum would
      // paint "Security (0)" and tell its readers this tool has no security
      // laws. It must render from this field instead.
      executeLawsAction({ json: true });

      const payload = emittedJson();
      expect(payload.registryCategories).toEqual(populatedCategories());
      expect(payload.registryCategories).not.toContain('security');
    });

    it('should carry every public spelling of a law identity', () => {
      executeLawsAction({ json: true });

      const payload = emittedJson();
      const law = payload.laws[0];

      expect(law.slug).toBe(ModularLawsRegistry.slugifyLawName(law.name));
      expect(law.identityKeys).toEqual(
        expect.arrayContaining([law.id, law.slug, law.name])
      );
    });

    it('should never serialize the check function', () => {
      executeLawsAction({ json: true });

      const payload = emittedJson();
      expect(payload.laws[0]).not.toHaveProperty('check');
    });
  });

  describe('serializeLaw', () => {
    it('should represent a universal law with stack: null, not undefined', () => {
      const universal = ModularLawsRegistry.getAll().find(
        law => law.stack === undefined
      );

      expect(universal).toBeDefined();
      expect(serializeLaw(universal!).stack).toBeNull();
    });

    it('should survive a JSON round-trip without losing fields', () => {
      const law = ModularLawsRegistry.getAll()[0]!;
      const serialized = serializeLaw(law);

      expect(JSON.parse(JSON.stringify(serialized))).toEqual(serialized);
    });
  });

  describe('buildLawsJson', () => {
    it('should keep registryTotal at the full registry even when filtered', () => {
      const filtered = filterLaws(ModularLawsRegistry.getAll(), {
        category: REAL_CATEGORY,
      });
      const payload = buildLawsJson(filtered, { category: REAL_CATEGORY });

      expect(payload.registryTotal).toBe(TOTAL_LAWS_COUNT);
      expect(payload.returned).toBeLessThan(payload.registryTotal);
    });
  });

  describe('displayLaws', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    const printed = (): string =>
      consoleSpy.mock.calls.map(c => String(c[0])).join('\n');

    it('should display all laws when unfiltered', () => {
      displayLaws(ModularLawsRegistry.getAll(), {});

      expect(printed()).toContain('COMPLETE CONSTITUTIONAL REGISTRY');
    });

    it('should display the Pareto header when pareto is set', () => {
      displayLaws(ModularLawsRegistry.getParetoCore(), { pareto: true });

      expect(printed()).toContain('PARETO HIGH-IMPACT LAWS');
    });

    it('should display version in output', () => {
      displayLaws(ModularLawsRegistry.getAll(), {});

      expect(printed()).toMatch(/RuleOfCode v\d+\.\d+\.\d+/);
    });

    it('should state the applied filter and the resulting count', () => {
      const filtered = filterLaws(ModularLawsRegistry.getAll(), {
        category: REAL_CATEGORY,
      });
      displayLaws(filtered, { category: REAL_CATEGORY });

      const output = printed();
      expect(output).toContain(`category=${REAL_CATEGORY}`);
      expect(output).toContain(
        `Showing ${filtered.length} of ${TOTAL_LAWS_COUNT}`
      );
    });

    it('should say so honestly when a valid filter matches nothing', () => {
      displayLaws([], { pareto: true, category: REAL_CATEGORY });

      expect(printed()).toContain('no law matches these filters');
    });
  });
});
