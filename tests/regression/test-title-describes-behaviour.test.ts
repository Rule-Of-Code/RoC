/**
 * #557 — Angular Testing Excellence reported every test whose title does not
 * start with "should". The prefix is a style: `it('returns the cached value
 * on the second call')` describes behaviour as well as the "should" form.
 * What a quality law can judge is whether the title describes anything: not
 * empty, not a placeholder, not only the name of the unit under test.
 *
 * The "should" prefix stays available as an opt-in convention.
 */
import { AngularTestingExcellenceLaw } from '../../src/checkers/angular-laws/angular-testing-excellence';
import type { RuleOfCodeConfig } from '../../src/types';
import { FileUtils } from '../../src/utils/file-utils';
import { project, removeProjects } from '../checkers/toolkit-fixture';

const ANGULAR = {
  'angular.json': JSON.stringify({ version: 1 }),
  'package.json': JSON.stringify({
    name: 'angular-app',
    dependencies: { '@angular/core': '18.0.0' },
  }),
};

const titleFindings = (
  titles: string[],
  config?: RuleOfCodeConfig
): string[] => {
  const root = project({
    ...ANGULAR,
    'src/app/cache.service.spec.ts': [
      "describe('CacheService behaviour', () => {",
      ...titles.map(title => `  it('${title}', () => { expect(1).toBe(1); });`),
      '});',
    ].join('\n'),
  });
  const result = AngularTestingExcellenceLaw.check({
    projectRoot: root,
    config: config ?? FileUtils.getMinimalDefaultConfig(),
  });
  return (result.violations ?? []).filter(v =>
    /should start with|[Tt]est (case )?title/.test(v)
  );
};

describe('#557 a test title must describe behaviour; "should" is a convention', () => {
  afterEach(removeProjects);

  it('accepts a descriptive title without "should"', () => {
    expect(
      titleFindings([
        'returns the cached value on the second call',
        'evicts the oldest entry when full',
      ])
    ).toEqual([]);
  });

  it('accepts a descriptive title with "should"', () => {
    expect(
      titleFindings(['should return the cached value on the second call'])
    ).toEqual([]);
  });

  /** The red controls: a title that says nothing is still reported, by file and title. */
  it.each([['test'], ['test 1'], ['works'], ['it works']])(
    'reports the placeholder title "%s"',
    title => {
      const findings = titleFindings([title]);
      expect(findings).toHaveLength(1);
      expect(findings[0]).toContain('cache.service.spec.ts');
      expect(findings[0]).toContain(`"${title}"`);
    }
  );

  it('reports an empty title', () => {
    expect(titleFindings([''])).toHaveLength(1);
  });
});
