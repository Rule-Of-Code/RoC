/**
 * `test-isolation-enforcement` and `test-data-management` carry the same
 * resource check but looked for test files differently (#192): the isolation
 * law searched src/, apps/ and libs/ only, so a root `tests/` or `e2e/` was
 * invisible to it; the data-management law searched six roots but with a
 * built-in minimal config, so the project's own `ignores` never reached it.
 * Neither honoured a root-relative `ignores.global` entry, because discovery
 * globbed per search root and matched `src/vendor/**` against `vendor/c.spec.ts`.
 *
 * One discovery now feeds both, with the project's config, and an ignore is
 * matched against the path from the project root.
 */
import { UnitTestDataManagementAnalyzerService } from '../../src/laws/testing/unit-test-data-management/services/data-management-analyzer.service';
import { UnitTestIsolationAnalyzerService } from '../../src/laws/testing/unit-test-isolation/services/isolation-analyzer.service';
import { TestFileDiscovery } from '../../src/laws/testing/test-file-discovery';
import { ctx, project, removeProjects } from '../checkers/toolkit-fixture';

afterAll(removeProjects);

const SPEC = "it('saves', () => { sessionStorage.setItem('k', 'v'); expect(1).toBe(1); });";
const FILES = {
  'tests/store.spec.ts': SPEC,
  'e2e/b.spec.ts': SPEC,
  'src/vendor/c.spec.ts': SPEC,
  'src/app/a.spec.ts': SPEC,
};
const IGNORING_VENDOR = {
  ignores: { global: ['src/vendor/**'], tests: [], build: [], design: [] },
};

const isolationFindings = (root: string, overrides = {}) =>
  UnitTestIsolationAnalyzerService.analyzeResourceIsolation(root, ctx(root, overrides).config)
    .unisolated.sort();
const dataManagementFindings = (root: string, overrides = {}) =>
  UnitTestDataManagementAnalyzerService.analyzeCleanupPatterns(root, ctx(root, overrides).config)
    .uncleaned.sort();

describe('the twin testing laws read one file set (#192)', () => {
  const root = project(FILES);

  it('both see the root tests/ and e2e/ directories, and the src/ files', () => {
    const expected = [
      'e2e/b.spec.ts (sessionStorage)',
      'src/app/a.spec.ts (sessionStorage)',
      'src/vendor/c.spec.ts (sessionStorage)',
      'tests/store.spec.ts (sessionStorage)',
    ];
    expect(isolationFindings(root)).toEqual(expected);
    expect(dataManagementFindings(root)).toEqual(expected);
  });

  it('both honour a root-relative ignores.global entry', () => {
    const expected = [
      'e2e/b.spec.ts (sessionStorage)',
      'src/app/a.spec.ts (sessionStorage)',
      'tests/store.spec.ts (sessionStorage)',
    ];
    expect(isolationFindings(root, IGNORING_VENDOR)).toEqual(expected);
    expect(dataManagementFindings(root, IGNORING_VENDOR)).toEqual(expected);
  });
});

describe('TestFileDiscovery', () => {
  it('matches an ignores.global entry against the path from the project root', () => {
    const root = project(FILES);
    const found = TestFileDiscovery.findTestFiles(root, ctx(root, IGNORING_VENDOR).config)
      .map(file => file.replace(/\\/g, '/').slice(root.replace(/\\/g, '/').length + 1))
      .sort();
    expect(found).toEqual(['e2e/b.spec.ts', 'src/app/a.spec.ts', 'tests/store.spec.ts']);
  });

  it('matches an includes.global entry against the path from the project root', () => {
    // A project that scopes the scan to `apps/**` saw ZERO test files: each
    // search root was scanned on its own, and `apps/**` was compared with
    // `web/src/a.spec.ts`.
    const root = project({
      'apps/web/src/a.spec.ts': SPEC,
      'libs/ui/src/b.spec.ts': SPEC,
    });
    const config = ctx(root, { includes: { global: ['apps/**/*.ts'] } }).config;
    const found = TestFileDiscovery.findTestFiles(root, config).map(file =>
      file.replace(/\\/g, '/').slice(root.replace(/\\/g, '/').length + 1)
    );
    expect(found).toEqual(['apps/web/src/a.spec.ts']);
  });

  it('finds a component test written as .test.tsx or .spec.jsx (#208 spellings)', () => {
    const root = project({
      'src/Button.test.tsx': SPEC,
      'src/Card.spec.jsx': SPEC,
      'src/Button.tsx': 'export const B = 1;',
    });
    const found = TestFileDiscovery.findTestFiles(root, ctx(root).config)
      .map(file => file.replace(/\\/g, '/').split('/').pop())
      .sort();
    expect(found).toEqual(['Button.test.tsx', 'Card.spec.jsx']);
  });
});
