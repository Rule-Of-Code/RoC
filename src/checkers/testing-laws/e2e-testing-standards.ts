/**
 * E2E Testing Standards Law
 * An application should have an end-to-end testing setup. RoC is runner-neutral:
 * it accepts any of the common E2E stacks (Playwright, Cypress, Protractor,
 * WebdriverIO, Nightwatch) detected via dependencies, a runner config file, or
 * E2E spec files. Only applications are checked (libraries are exempt), so the
 * law does not produce false positives on non-app packages.
 */

import fs from 'fs';
import path from 'path';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils/file-utils';
import { TestingLawBase } from './testing-law-base';

export class E2ETestingStandardsLaw extends TestingLawBase {
  private static readonly E2E_DEPS = [
    '@playwright/test',
    'playwright',
    'cypress',
    'protractor',
    'nightwatch',
    'webdriverio',
    '@wdio/cli',
    'testcafe',
    '@cypress/schematic',
  ];

  private static readonly E2E_CONFIG_FILES = [
    'playwright.config.ts',
    'playwright.config.js',
    'cypress.config.ts',
    'cypress.config.js',
    'cypress.json',
    'protractor.conf.js',
    'wdio.conf.ts',
    'wdio.conf.js',
    'nightwatch.conf.js',
    '.testcaferc.json',
  ];

  static check(context: LawCheckContext): LawResult {
    const { projectRoot } = context;
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Only applications need E2E coverage; skip libraries (no app entry point).
    if (!this.isApplication(projectRoot)) {
      return this.result(violations, suggestions, context);
    }

    const hasDep = this.hasE2EDependency(projectRoot);
    const hasConfig = this.E2E_CONFIG_FILES.some(f =>
      fs.existsSync(path.join(projectRoot, f))
    );
    const e2eSpecs = this.findE2ESpecs(projectRoot);
    const hasSpecs = e2eSpecs.length > 0;

    if (!hasDep && !hasConfig && !hasSpecs) {
      violations.push(
        'No end-to-end (E2E) testing setup detected (no E2E runner dependency, config, or spec files)'
      );
      suggestions.push(
        'Add an E2E runner (e.g. Playwright or Cypress) with a config and at least one E2E spec'
      );
    } else if (hasSpecs && !hasDep && !hasConfig) {
      // Specs exist but no runner is wired up — they will never run in CI.
      violations.push(
        'E2E spec files exist but no E2E runner dependency or config was found'
      );
      suggestions.push(
        'Install and configure the E2E runner so the existing E2E specs can execute'
      );
    }

    return this.result(violations, suggestions, context);
  }

  private static isApplication(projectRoot: string): boolean {
    if (fs.existsSync(path.join(projectRoot, 'angular.json'))) return true;
    if (fs.existsSync(path.join(projectRoot, 'src', 'main.ts'))) return true;
    if (fs.existsSync(path.join(projectRoot, 'src', 'main.tsx'))) return true;
    const pkg = this.readPackageJson(projectRoot);
    if (!pkg) return false;
    const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
    return [
      '@angular/platform-browser',
      '@angular/core',
      'react-dom',
      'vue',
      '@nestjs/core',
      'next',
    ].some(d => d in deps);
  }

  private static hasE2EDependency(projectRoot: string): boolean {
    const pkg = this.readPackageJson(projectRoot);
    if (!pkg) return false;
    const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
    return this.E2E_DEPS.some(d => d in deps);
  }

  private static readPackageJson(
    projectRoot: string
  ): { dependencies?: Record<string, string>; devDependencies?: Record<string, string> } | null {
    const p = path.join(projectRoot, 'package.json');
    if (!fs.existsSync(p)) return null;
    try {
      const raw = FileUtils.readFileContentSync(p);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  private static findE2ESpecs(projectRoot: string): string[] {
    const { glob } = require('glob');
    const patterns = [
      '**/*.e2e-spec.ts',
      '**/*.e2e.spec.ts',
      '**/*.cy.ts',
      '**/*.cy.js',
      '**/e2e/**/*.spec.ts',
      '**/e2e/**/*.test.ts',
    ];
    const found: string[] = [];
    for (const pattern of patterns) {
      found.push(
        ...glob.sync(pattern, {
          cwd: projectRoot,
          absolute: true,
          ignore: ['**/node_modules/**', '**/dist/**', '**/.angular/**'],
        })
      );
    }
    return found;
  }

  private static result(
    violations: string[],
    suggestions: string[],
    context: LawCheckContext
  ): LawResult {
    return {
      passed: violations.length === 0,
      score: Math.max(0, 100 - violations.length * 25),
      message:
        violations.length === 0
          ? 'E2E Testing Standards satisfied'
          : `E2E testing issues found: ${violations[0]}`,
      details: [...violations, ...suggestions],
      violations,
      suggestions,
      config: context.config,
      fixable: false,
    };
  }
}
