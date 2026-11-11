/**
 * What the test-integrity laws share: which files are tests, which of them
 * Playwright runs, and how to read them as syntax.
 *
 * A test file is found by the name every runner looks for by default —
 * `.spec`/`.test` (Jest, Vitest, Mocha, Jasmine, Playwright), `.cy` (Cypress),
 * `.e2e-spec` (Protractor-era Angular) — in any of the JS/TS extensions, or by
 * living in a `__tests__` directory (Jest's default `testMatch`). The scan
 * starts at the project root and honours the project's ignores and includes,
 * matched from that root.
 *
 * A Playwright file is found the way Playwright finds it: under the `testDir`
 * of a `playwright.config.*`, or by importing the runner. A unit test that
 * calls Testing Library's `screen.getByRole` and a Playwright spec that calls
 * `page.getByRole` use the same name for different things; reading where a
 * file belongs, not what it calls, is what keeps them apart.
 */

import type { LawRequirement } from '../../types/enhanced-law.types';
import type { LawCheckContext } from '../../types/law.types';
import { FileUtils } from '../file-utils';
import { PathOperations } from '../path-operations';
import { ReactProject } from '../react/react-project';
import type { TsxSource } from '../react/tsx-source';

/** Every extension a JS/TS test can be written in. */
export const TEST_SOURCE_EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs'];

/** A test file name in the default spelling of Jest, Vitest, Mocha, Jasmine, Playwright and Cypress. */
export const TEST_SOURCE_NAME = /\.(?:spec|test|cy|e2e-spec)\.[cm]?[jt]sx?$/;

/** Jest's default `testMatch` also runs every file under a `__tests__` directory. */
const TESTS_DIRECTORY = /(?:^|\/)__tests__\//;

/** A Playwright config, in every extension Playwright loads. */
const PLAYWRIGHT_CONFIG = /(?:^|\/)playwright(?:-ct)?\.config\.[cm]?[jt]s$/;

/** The modules a Playwright file imports the runner (or the library) from. */
export const PLAYWRIGHT_MODULES = ['@playwright/test', 'playwright'];

/** Selected where Playwright is declared. */
export const REQUIRES_PLAYWRIGHT: LawRequirement = { anyDependency: PLAYWRIGHT_MODULES };

/**
 * Selected where a JS/TS runner that has a focus modifier is declared:
 * `.only` (Jest, Vitest, Mocha, Playwright, Cypress) or `fit`/`fdescribe`
 * (Jasmine, Jest).
 */
export const REQUIRES_JS_TEST_RUNNER: LawRequirement = {
  anyDependency: [
    'jest',
    'vitest',
    'mocha',
    '@playwright/test',
    'jasmine',
    'jasmine-core',
    'cypress',
  ],
};

/** Selected where React Testing Library is declared. */
export const REQUIRES_REACT_TESTING_LIBRARY: LawRequirement = {
  anyDependency: ['@testing-library/react'],
};

/** Parsed files, and what could not be read (a violation for every caller). */
export interface ReadSources {
  sources: TsxSource[];
  unread: string[];
}

export interface PlaywrightFiles extends ReadSources {
  /** The Playwright configs found, relative to the project root. */
  configs: string[];
  /**
   * True when the scan provably saw the Playwright suite: a config exists, or
   * a scanned file imports the runner. False means nothing was inspected.
   */
  found: boolean;
}

export class TestSources {
  /** Every JS/TS file the scan reaches, tests included, declarations excluded. */
  static codeFiles(context: LawCheckContext): string[] {
    return FileUtils.scanForFiles(
      context.projectRoot,
      context.config,
      [...TEST_SOURCE_EXTENSIONS],
      context.lawId,
      true
    ).filter(file => !/\.d\.[cm]?ts$/.test(file));
  }

  /** True for a test file by name or by a `__tests__` directory (path relative or absolute). */
  static isTestFile(file: string): boolean {
    const normal = file.replace(/\\/g, '/');
    return TEST_SOURCE_NAME.test(normal) || TESTS_DIRECTORY.test(normal);
  }

  /** Every test file of the project. */
  static testFiles(context: LawCheckContext): string[] {
    return this.codeFiles(context).filter(file => this.isTestFile(file));
  }

  /** Parse with the project's TypeScript; see ReactProject.parse for the contract. */
  static parse(context: LawCheckContext, files: readonly string[]): ReadSources {
    return ReactProject.parse(context, files);
  }

  /** True when the file imports, re-exports or requires one of `modules`. */
  static importsAny(source: TsxSource, modules: readonly string[]): boolean {
    if (source.imports().some(info => modules.includes(info.module))) return true;
    const ts = source.ts;
    const reExports = source.sourceFile.statements.some(
      statement =>
        ts.isExportDeclaration(statement) &&
        statement.moduleSpecifier !== undefined &&
        ts.isStringLiteral(statement.moduleSpecifier) &&
        modules.includes(statement.moduleSpecifier.text)
    );
    if (reExports) return true;
    let found = false;
    source.walk(node => {
      if (found || !ts.isCallExpression(node)) return;
      const [argument] = node.arguments;
      const isLoad =
        node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === 'require');
      if (isLoad && argument && ts.isStringLiteralLike(argument)) {
        found = modules.includes(argument.text);
      }
    });
    return found;
  }

  /**
   * The files Playwright runs and the helpers they share: every file under a
   * config's `testDir` that is a test or imports the runner, and every test
   * file anywhere that imports the runner.
   */
  static playwrightFiles(context: LawCheckContext): PlaywrightFiles {
    const files = this.codeFiles(context);
    const configFiles = files.filter(file => PLAYWRIGHT_CONFIG.test(file.replace(/\\/g, '/')));
    const configs = this.parse(context, configFiles);
    const testDirs = configs.sources.map(config => this.testDir(config));
    const underTestDir = (file: string): boolean =>
      testDirs.some(dir => PathOperations.isInDirectory(file, dir));

    const candidates = files.filter(
      file =>
        !configFiles.includes(file) && (underTestDir(file) || this.isTestFile(file))
    );
    const parsed = this.parse(context, candidates);
    const sources = parsed.sources.filter(source => {
      const importsRunner = this.importsAny(source, PLAYWRIGHT_MODULES);
      return underTestDir(source.fileName)
        ? importsRunner || this.isTestFile(source.fileName)
        : importsRunner;
    });
    return {
      sources,
      unread: [...configs.unread, ...parsed.unread],
      configs: configFiles.map(file => ReactProject.relative(context, file)),
      found:
        configFiles.length > 0 ||
        sources.some(source => this.importsAny(source, PLAYWRIGHT_MODULES)),
    };
  }

  /**
   * A config's `testDir`, resolved from the config's directory — the
   * directory itself when `testDir` is absent (Playwright's default) or is
   * not a string literal this parse can read.
   */
  private static testDir(config: TsxSource): string {
    const ts = config.ts;
    const base = PathOperations.getDirectory(config.fileName);
    let dir: string | null = null;
    config.walk(node => {
      if (dir !== null || !ts.isPropertyAssignment(node)) return;
      if (node.name.getText(config.sourceFile) !== 'testDir') return;
      if (ts.isStringLiteralLike(node.initializer)) {
        dir = PathOperations.resolve(base, node.initializer.text);
      }
    });
    return dir ?? base;
  }
}
