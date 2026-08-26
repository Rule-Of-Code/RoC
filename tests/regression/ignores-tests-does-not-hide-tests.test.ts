import { FileFilterUtils } from '../../src/utils/file-filter-utils';
import { DEFAULT_CONFIG } from '../../src/config/types';
import type { RuleOfCodeConfig } from '../../src/types/law.types';

/**
 * `ignores.tests` was applied to the scans that exist to COUNT tests.
 *
 * The assembly stripped the spec patterns out of `ignores.global` when
 * `includeTests` was true — and then pushed `ignores.tests` unconditionally
 * twelve lines later, putting every one of them straight back.
 *
 * Nobody had to write the key for this to bite. The loader injects
 * `**​/*.spec.ts`, `**​/*.test.ts` and `**​/e2e/**` from DEFAULT_CONFIG, so a
 * config that never mentions tests still hid all of them.
 *
 * The coverage ratio was the visible half — 1.6% on a repository with 30 spec
 * files, where the single surviving "test" was a `tsconfig.spec.json`. The
 * serious half was silent: two laws scored **100/100** because they found
 * nothing to check. A law that passes for want of subject matter is
 * fail-open, and those hundreds were published for weeks.
 */
describe('ignores.tests applies only when tests are excluded', () => {
  const configWith = (tests: string[]): RuleOfCodeConfig =>
    ({
      ignores: { global: [], tests, build: [], design: [] },
    }) as unknown as RuleOfCodeConfig;

  const patterns = (
    config: RuleOfCodeConfig,
    includeTests: boolean
  ): string[] => FileFilterUtils.getIgnorePatterns(config, undefined, includeTests);

  /** The defaults are what bit, so they are what the test uses. */
  const DEFAULT_TEST_IGNORES = DEFAULT_CONFIG.ignores?.tests ?? [];

  it('the default config really does inject spec patterns', () => {
    expect(DEFAULT_TEST_IGNORES).toContain('**/*.spec.ts');
  });

  it('a scan FOR tests does not ignore them', () => {
    const found = patterns(configWith(DEFAULT_TEST_IGNORES), true);

    for (const pattern of DEFAULT_TEST_IGNORES) {
      expect(found).not.toContain(pattern);
    }
  });

  /** The red control: excluding tests must still exclude them. */
  it('a scan that excludes tests still honours the key', () => {
    const found = patterns(configWith(DEFAULT_TEST_IGNORES), false);

    for (const pattern of DEFAULT_TEST_IGNORES) {
      expect(found).toContain(pattern);
    }
  });

  it('a project-declared test ignore is honoured the same way', () => {
    const declared = ['**/legacy-specs/**'];

    expect(patterns(configWith(declared), false)).toContain(declared[0]);
    expect(patterns(configWith(declared), true)).not.toContain(declared[0]);
  });

  /**
   * The two halves must not disagree: stripping the patterns from
   * `ignores.global` is pointless if the same patterns return via
   * `ignores.tests`.
   */
  it('does not re-add through tests what it removed from global', () => {
    const config = {
      ignores: {
        global: ['**/*.spec.ts', '**/node_modules/**'],
        tests: ['**/*.spec.ts'],
        build: [],
        design: [],
      },
    } as unknown as RuleOfCodeConfig;

    const found = patterns(config, true);

    expect(found.filter(p => p === '**/*.spec.ts')).toEqual([]);
    expect(found).toContain('**/node_modules/**');
  });

  it('leaves the other categorical ignores alone', () => {
    const config = {
      ignores: {
        global: [],
        tests: ['**/*.spec.ts'],
        build: ['**/dist/**'],
        design: ['**/*.figma'],
      },
    } as unknown as RuleOfCodeConfig;

    const found = patterns(config, true);

    expect(found).toContain('**/dist/**');
    expect(found).toContain('**/*.figma');
  });
});