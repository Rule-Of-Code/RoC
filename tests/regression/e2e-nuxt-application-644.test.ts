/**
 * #644: E2E Testing Standards knew `vue` but not `nuxt`, so a Nuxt project
 * that declares `nuxt` alone was not an application for the law and passed
 * without being judged.
 */
import { E2ETestingStandardsLaw } from '../../src/checkers/testing-laws/e2e-testing-standards';
import { ctx, project, removeProjects } from '../checkers/toolkit-fixture';

afterAll(removeProjects);

const NO_SETUP =
  'No end-to-end (E2E) testing setup detected (no E2E runner dependency, config, or spec files)';

const run = (
  dependencies: Record<string, string>,
  files: Record<string, string> = {}
) =>
  E2ETestingStandardsLaw.check(
    ctx(
      project({
        'package.json': JSON.stringify({
          name: 'x',
          version: '1.0.0',
          dependencies,
        }),
        ...files,
      })
    )
  );

describe('#644 a Nuxt project is an application for E2E Testing Standards', () => {
  it('nuxt alone, no E2E setup: reported', () => {
    const result = run({ nuxt: '3.0.0' });
    expect(result.violations).toEqual([NO_SETUP]);
    expect(result.passed).toBe(false);
  });

  it('nuxt with Playwright and its config: passes', () => {
    const result = run(
      { nuxt: '3.0.0', '@playwright/test': '1.0.0' },
      { 'playwright.config.ts': 'export default {};\n' }
    );
    expect(result.violations).toEqual([]);
    expect(result.passed).toBe(true);
  });

  it('control: a library with no application marker is not judged', () => {
    const result = run({ lodash: '4.0.0' });
    expect(result.violations).toEqual([]);
    expect(result.passed).toBe(true);
  });
});
