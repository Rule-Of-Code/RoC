/**
 * The project files the tests import directly.
 *
 * Test Coverage counted a source file as covered only when a test was NAMED
 * after it (`foo.ts` ↔ `foo.spec.ts`). A test that imports `foo.ts` and
 * exercises it under another name — one spec for a folder, an integration
 * test, `tests/` mirroring `src/` under different names — counted for
 * nothing, so the law asked for tests that already existed.
 *
 * What counts as an import of a test file, read with `ts.preProcessFile`
 * (no type-checking, no parse tree): `import … from`, `export … from`,
 * `import x = require()`, `require()` and `import()` with a literal path,
 * plus the module paths a mocking call names (`jest.mock`, `jest.doMock`,
 * `jest.requireActual`, `vi.mock`, `vi.importActual` …) — the module a test
 * mocks or loads for real is the module it is written against.
 *
 * Direct only: a file the test reaches through another module is not
 * counted. Resolution is the TypeScript resolver's, from the test file, with
 * the compiler options of the nearest tsconfig.json (or jsconfig.json) inside
 * the project — so `paths` and `baseUrl` aliases resolve as the build
 * resolves them. An alias declared anywhere else (a Jest `moduleNameMapper`,
 * a bundler alias) is not followed: a file reached only that way is judged
 * by its test's name, as before.
 */

import * as fs from 'fs';
import type * as TS from 'typescript';
import { PathOperations } from '../path-operations';
import type { TypeScriptModule } from '../react/tsx-source';

/** A mocking call that names a module path: `jest.mock('./x')`, `vi.importActual('./x')`. */
const MOCKED_MODULE =
  /\b(?:jest|vi)\.(?:mock|doMock|unmock|dontMock|requireActual|requireMock|importActual|importMock)\(\s*(['"`])([^'"`\r\n]+)\1/g;

/** A JavaScript file a `.d.ts` may stand beside. */
const JS_BESIDE_DECLARATION = ['.js', '.jsx', '.mjs', '.cjs'];

const CONFIG_NAMES = ['tsconfig.json', 'jsconfig.json'];

/**
 * One spelling per file: the real path (symlinks and junctions followed,
 * Windows 8.3 short names expanded, the case on disk), with forward slashes.
 * The resolver follows symlinks for a package import and the directory walk
 * does not, so the two lists only compare in this form.
 */
export function canonicalPath(file: string): string {
  try {
    return PathOperations.normalize(fs.realpathSync.native(file));
  } catch {
    return PathOperations.resolve(file);
  }
}

/**
 * Reads which project files a set of test files imports directly, resolving
 * each import from its test file with the nearest tsconfig/jsconfig (see the
 * file comment for what counts as an import).
 */
export class TestImportReader {
  private readonly optionsByDirectory = new Map<string, TS.CompilerOptions>();
  private readonly optionsByConfig = new Map<string, TS.CompilerOptions>();
  private readonly caches = new Map<
    TS.CompilerOptions,
    TS.ModuleResolutionCache
  >();
  private readonly projectRoot: string;
  /** No config inside the project: Node resolution, JavaScript included. */
  private readonly defaults: TS.CompilerOptions = { allowJs: true };

  constructor(
    private readonly ts: TypeScriptModule,
    projectRoot: string
  ) {
    this.projectRoot = canonicalPath(projectRoot);
  }

  /** Every project file at least one of these tests imports directly, as `canonicalPath`. */
  importedBy(testFiles: readonly string[]): Set<string> {
    const imported = new Set<string>();
    for (const testFile of testFiles) {
      for (const file of this.importsOf(PathOperations.resolve(testFile))) {
        imported.add(file);
      }
    }
    return imported;
  }

  /** The project files one test file imports directly. */
  private importsOf(testFile: string): string[] {
    let text: string;
    try {
      text = fs.readFileSync(testFile, 'utf8');
    } catch {
      return [];
    }
    const specifiers = this.ts
      .preProcessFile(text, true, true)
      .importedFiles.map(file => file.fileName);
    for (const [, , specifier] of text.matchAll(MOCKED_MODULE)) {
      if (specifier) specifiers.push(specifier);
    }
    const files: string[] = [];
    for (const specifier of specifiers) {
      const file = this.resolve(specifier, testFile);
      if (file) files.push(file);
    }
    return files;
  }

  /** The project file a specifier names from `from` (`canonicalPath`), or null: a package, unresolved. */
  private resolve(specifier: string, from: string): string | null {
    const options = this.optionsFor(from);
    const resolved = this.ts.resolveModuleName(
      specifier,
      from,
      options,
      this.ts.sys,
      this.cacheFor(options)
    ).resolvedModule;
    if (!resolved || resolved.isExternalLibraryImport) return null;
    let file = PathOperations.resolve(resolved.resolvedFileName);
    if (/\.d\.[cm]?ts$/.test(file)) {
      // A `.d.ts` beside a `.js` file: the test loads the JavaScript.
      file = this.javascriptBeside(file) ?? '';
    }
    if (!file || file.includes('/node_modules/')) return null;
    const real = canonicalPath(file);
    return PathOperations.isInDirectory(real, this.projectRoot) ? real : null;
  }

  /** One resolution cache per set of options: a package is looked up once per directory. */
  private cacheFor(options: TS.CompilerOptions): TS.ModuleResolutionCache {
    let cache = this.caches.get(options);
    if (!cache) {
      const ts = this.ts;
      cache = ts.createModuleResolutionCache(
        this.projectRoot,
        name => (ts.sys.useCaseSensitiveFileNames ? name : name.toLowerCase()),
        options
      );
      this.caches.set(options, cache);
    }
    return cache;
  }

  private javascriptBeside(declaration: string): string | null {
    const base = declaration.replace(/\.d\.[cm]?ts$/, '');
    for (const extension of JS_BESIDE_DECLARATION) {
      if (fs.existsSync(base + extension)) return base + extension;
    }
    return null;
  }

  /** The compiler options of the nearest config inside the project, memoised per directory. */
  private optionsFor(file: string): TS.CompilerOptions {
    const directory = PathOperations.getDirectory(file);
    const cached = this.optionsByDirectory.get(directory);
    if (cached) return cached;
    const config = this.nearestConfig(directory);
    const options = config ? this.readOptions(config) : this.defaults;
    this.optionsByDirectory.set(directory, options);
    return options;
  }

  private nearestConfig(directory: string): string | null {
    for (const name of CONFIG_NAMES) {
      const found = this.ts.findConfigFile(
        directory,
        this.ts.sys.fileExists,
        name
      );
      if (
        found &&
        PathOperations.isInDirectory(canonicalPath(found), this.projectRoot)
      ) {
        return PathOperations.resolve(found);
      }
    }
    return null;
  }

  /**
   * A config's compiler options with `extends` followed. Its file list is not
   * enumerated — only the resolver settings are needed — so the directory
   * read returns nothing.
   */
  private readOptions(configFile: string): TS.CompilerOptions {
    const cached = this.optionsByConfig.get(configFile);
    if (cached) return cached;
    const ts = this.ts;
    let options = this.defaults;
    const read = ts.readConfigFile(configFile, ts.sys.readFile);
    if (!read.error) {
      const host: TS.ParseConfigHost = {
        useCaseSensitiveFileNames: ts.sys.useCaseSensitiveFileNames,
        readDirectory: () => [],
        fileExists: ts.sys.fileExists,
        readFile: ts.sys.readFile,
      };
      const parsed = ts.parseJsonConfigFileContent(
        read.config,
        host,
        PathOperations.getDirectory(configFile)
      );
      options = { ...options, ...parsed.options, allowJs: true };
    }
    this.optionsByConfig.set(configFile, options);
    return options;
  }
}
