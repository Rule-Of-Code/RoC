/**
 * End-to-end spec discovery, shared by the laws that ask "does this project
 * have e2e tests?".
 *
 * Two laws each kept their own list, and both missed the layout Nx generates
 * for every app — `apps/<name>-e2e/src/*.spec.ts`: one read only root-level
 * `e2e/`, `cypress/` and `tests/`, the other only a directory named exactly
 * `e2e`. A Playwright suite of 93 tests was "no E2E tests found", an error,
 * as soon as the Angular source count that guards the check became accurate
 * (#335).
 *
 * Globbed directly, past `includes`/`ignores`: projects scope the audit to
 * library sources and ignore specs for the quality laws, and the question
 * "is there an e2e suite" must still see it.
 */
import { glob } from 'glob';

const E2E_SPEC_PATTERNS = [
  // Named as e2e wherever it lives (Protractor-era Angular, custom suites).
  '**/*.e2e-spec.{ts,js}',
  '**/*.e2e.{spec,test}.{ts,js}',
  // Cypress.
  '**/*.cy.{ts,js}',
  '**/cypress/**/*.{spec,test}.{ts,js}',
  // An e2e project or folder: `e2e/`, and Nx's `apps/<name>-e2e/`.
  '**/e2e/**/*.{spec,test}.{ts,js}',
  '**/*-e2e/**/*.{spec,test}.{ts,js}',
];

const IGNORED = ['**/node_modules/**', '**/dist/**', '**/.angular/**', '**/.nx/**'];

/** Every e2e spec in the project (absolute paths), in a stable order. */
export function findE2ESpecs(projectRoot: string, extraPatterns: readonly string[] = []): string[] {
  const found = new Set<string>();
  for (const pattern of [...E2E_SPEC_PATTERNS, ...extraPatterns]) {
    for (const file of glob.sync(pattern, { cwd: projectRoot, absolute: true, ignore: IGNORED })) {
      found.add(file);
    }
  }
  return [...found].sort();
}
