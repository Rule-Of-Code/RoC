/**
 * Tests for E2ETestingStandardsLaw (real detection — replaces the prior no-op).
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { E2ETestingStandardsLaw } from '../../../src/checkers/testing-laws/e2e-testing-standards';
import type { LawCheckContext } from '../../../src/types';

const dirs: string[] = [];
function fixture(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-e2e-'));
  dirs.push(dir);
  for (const [name, content] of Object.entries(files)) {
    const p = path.join(dir, name);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content);
  }
  return dir;
}
afterAll(() => {
  for (const dir of dirs) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* best effort */
    }
  }
});
const ctx = (root: string): LawCheckContext =>
  ({
    projectRoot: root,
    config: {
      project: { name: 't', root, componentPrefix: 'app', type: 'angular' },
      ignores: { global: [], tests: [], build: [], design: [] },
      laws: { paretoMode: false, severity: {} },
      hooks: { preCommit: false, prePush: false, commitMsg: false },
      includes: { global: [] },
      excludes: {},
      reporting: {
        format: 'console',
        verbose: false,
        onlyFailures: false,
        scoring: false,
      },
      performance: { parallel: false, maxConcurrent: 3, cache: false },
      thresholds: {},
    },
  }) as LawCheckContext;

const APP_PKG = JSON.stringify({
  name: 'app',
  dependencies: { '@angular/core': '18.0.0' },
});

describe('E2ETestingStandardsLaw', () => {
  it('flags an application with no E2E setup at all', () => {
    const dir = fixture({
      'package.json': APP_PKG,
      'angular.json': '{}',
      'src/main.ts': 'console.log("app");',
    });
    expect(E2ETestingStandardsLaw.check(ctx(dir)).passed).toBe(false);
  });

  it('passes when an E2E runner dependency is present (Playwright)', () => {
    const dir = fixture({
      'package.json': JSON.stringify({
        name: 'app',
        dependencies: { '@angular/core': '18.0.0' },
        devDependencies: { '@playwright/test': '1.40.0' },
      }),
      'angular.json': '{}',
      'playwright.config.ts': 'export default {};',
    });
    expect(E2ETestingStandardsLaw.check(ctx(dir)).passed).toBe(true);
  });

  it('passes when E2E spec files exist with a runner (Cypress)', () => {
    const dir = fixture({
      'package.json': JSON.stringify({
        name: 'app',
        dependencies: { '@angular/core': '18.0.0' },
        devDependencies: { cypress: '13.0.0' },
      }),
      'angular.json': '{}',
      'cypress/e2e/login.cy.ts': 'describe("login", () => {});',
    });
    expect(E2ETestingStandardsLaw.check(ctx(dir)).passed).toBe(true);
  });

  it('does NOT flag a library (no application entry point)', () => {
    const dir = fixture({
      'package.json': JSON.stringify({ name: 'lib', version: '1.0.0' }),
      'src/index.ts': 'export const x = 1;',
    });
    expect(E2ETestingStandardsLaw.check(ctx(dir)).passed).toBe(true);
  });

  it('flags E2E specs that exist without a runner wired up', () => {
    const dir = fixture({
      'package.json': APP_PKG,
      'angular.json': '{}',
      'e2e/app.e2e-spec.ts': 'describe("app", () => {});',
    });
    expect(E2ETestingStandardsLaw.check(ctx(dir)).passed).toBe(false);
  });
});
