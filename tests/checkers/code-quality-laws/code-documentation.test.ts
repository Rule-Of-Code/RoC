/**
 * Tests for CodeDocumentationLaw.
 *
 * The law judges exported classes and functions: each needs a JSDoc block, and
 * a JSDoc block at the top of the file documents the file's only exported
 * class/function. Real files in a temp directory, parsed with the TypeScript
 * this repository compiles with.
 */
import path from 'path';
import { CodeDocumentationLaw } from '../../../src/checkers/code-quality-laws/code-documentation';
import type { LawCheckContext, RuleOfCodeConfig } from '../../../src/types';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('CodeDocumentationLaw', () => {
  let tempDir: string;
  let mockConfig: RuleOfCodeConfig;
  let mockContext: LawCheckContext;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('code-documentation-test-');
    mockConfig = {
      project: {
        name: 'test-project',
        root: tempDir,
        componentPrefix: 'app',
        type: 'generic',
      },
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
      performance: {
        parallel: false,
        maxConcurrent: 3,
        cache: true,
      },
    };
    mockContext = {
      projectRoot: tempDir,
      config: mockConfig,
    };
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
  });

  /** Write `content` to src/<name> and return the law's violations. */
  const judge = (name: string, content: string): string[] => {
    FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
    FileUtils.writeFile(PathOperations.join(tempDir, 'src', name), content);
    return CodeDocumentationLaw.check(mockContext).violations ?? [];
  };

  describe('check()', () => {
    it('should return a LawResult object', () => {
      const result = CodeDocumentationLaw.check(mockContext);
      expect(result).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
    });

    it('should have violations array', () => {
      const result = CodeDocumentationLaw.check(mockContext);
      expect(Array.isArray(result.violations)).toBe(true);
    });

    it('should have suggestions array', () => {
      const result = CodeDocumentationLaw.check(mockContext);
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('should have score property', () => {
      const result = CodeDocumentationLaw.check(mockContext);
      expect(typeof result.score).toBe('number');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should have message property', () => {
      const result = CodeDocumentationLaw.check(mockContext);
      expect(typeof result.message).toBe('string');
    });

    it('should have config property', () => {
      const result = CodeDocumentationLaw.check(mockContext);
      expect(result.config).toBe(mockConfig);
    });

    it('should pass for empty project', () => {
      const result = CodeDocumentationLaw.check(mockContext);
      expect(result.passed).toBe(true);
    });
  });

  describe('exported classes', () => {
    it('an exported class without JSDoc is a finding, at its file and line', () => {
      const violations = judge(
        'services.ts',
        [
          "import { x } from './x';",
          '',
          '/** Keeps the users. */',
          'export class UserService {}',
          '',
          'export class OrderService {',
          '  getOrders(): number[] {',
          '    return [];',
          '  }',
          '}',
        ].join('\n')
      );
      expect(violations).toEqual([
        expect.stringMatching(
          /^src\/services\.ts:6: exported class OrderService has no JSDoc/
        ),
      ]);
    });

    it('an exported class with JSDoc is clean', () => {
      expect(
        judge(
          'user.service.ts',
          [
            "import { x } from './x';",
            '/** Reads and caches the users of one tenant. */',
            'export class UserService {',
            '  getUsers(): string[] {',
            '    return [];',
            '  }',
            '}',
            '/** Writes the users of one tenant. */',
            'export abstract class UserWriter {}',
          ].join('\n')
        )
      ).toEqual([]);
    });

    it('JSDoc above the decorators documents the class; JSDoc below them does not', () => {
      const violations = judge(
        'decorated.ts',
        [
          "import { Injectable } from '@angular/core';",
          '/** Above the decorator. */',
          "@Injectable({ providedIn: 'root' })",
          'export class Above {}',
          '',
          '@Injectable()',
          '/** Below the decorator. */',
          'export class Below {}',
        ].join('\n')
      );
      expect(violations).toEqual([
        expect.stringMatching(/^src\/decorated\.ts:6: exported class Below /),
      ]);
    });

    it('an empty JSDoc block is not documentation', () => {
      const violations = judge(
        'empty-doc.ts',
        ["import { x } from './x';", '/** */', 'export class Empty {}'].join(
          '\n'
        )
      );
      expect(violations).toEqual([
        expect.stringMatching(/exported class Empty has no JSDoc/),
      ]);
    });

    it('a class named in a template string is not a class', () => {
      expect(
        judge(
          'template.ts',
          [
            '/** Emits a class as text. */',
            'export const template = (): string => `',
            'export class Generated {}',
            '`;',
          ].join('\n')
        )
      ).toEqual([]);
    });
  });

  describe('the file header', () => {
    it("a JSDoc block at the top of the file documents the file's only exported class", () => {
      expect(
        judge(
          'only-class.ts',
          [
            '/**',
            ' * The one service of this file: reads the users.',
            ' */',
            '',
            "import { x } from './x';",
            '',
            'const helper = (): number => 1;',
            '',
            'export class OnlyService {}',
          ].join('\n')
        )
      ).toEqual([]);
    });

    it("documents the file's only exported function", () => {
      expect(
        judge(
          'only-function.ts',
          [
            '#!/usr/bin/env node',
            '/** Prints the version. */',
            "import { x } from './x';",
            'export function main(): void {}',
            'export interface Options { a: string }',
            'export const VERSION = 1;',
          ].join('\n')
        )
      ).toEqual([]);
    });

    it('does not document a file with two exported classes/functions', () => {
      const violations = judge(
        'two.ts',
        [
          '/** Two services. */',
          "import { x } from './x';",
          'export class First {}',
          'export function second(): void {}',
        ].join('\n')
      );
      expect(violations).toEqual([
        expect.stringMatching(/^src\/two\.ts:3: exported class First /),
        expect.stringMatching(/^src\/two\.ts:4: exported function second /),
      ]);
    });

    it('a // comment at the top of the file is not a header', () => {
      const violations = judge(
        'line-comment.ts',
        [
          '// The one service.',
          "import { x } from './x';",
          'export class OnlyService {}',
        ].join('\n')
      );
      expect(violations).toEqual([
        expect.stringMatching(
          /exported class OnlyService has no JSDoc .*the file’s only exported class\/function/
        ),
      ]);
    });
  });

  describe('exported functions', () => {
    it('an exported function without JSDoc is a finding — declarations, arrows, function expressions and default exports', () => {
      const violations = judge(
        'utils.ts',
        [
          "import { x } from './x';",
          'export function processData(data: unknown): void {}',
          'export async function fetchData(url: string): Promise<void> {}',
          'export const formatDate = (date: Date): string => date.toISOString();',
          'export const parse = function (s: string): number { return +s; };',
          'export default function (): void {}',
        ].join('\n')
      );
      expect(violations).toEqual([
        expect.stringMatching(
          /^src\/utils\.ts:2: exported function processData /
        ),
        expect.stringMatching(
          /^src\/utils\.ts:3: exported function fetchData /
        ),
        expect.stringMatching(
          /^src\/utils\.ts:4: exported function formatDate /
        ),
        expect.stringMatching(/^src\/utils\.ts:5: exported function parse /),
        expect.stringMatching(/^src\/utils\.ts:6: exported function default /),
      ]);
    });

    it('an exported function with JSDoc is clean; overloads are one function', () => {
      expect(
        judge(
          'documented-utils.ts',
          [
            "import { x } from './x';",
            '/** Sums the numbers. */',
            'export function total(items: number[]): number {',
            '  return items.reduce((a, b) => a + b, 0);',
            '}',
            '/** Reads a number from a string or passes one through. */',
            'export function read(s: string): number;',
            'export function read(n: number): number;',
            'export function read(v: string | number): number {',
            '  return +v;',
            '}',
            '/** Formats a date as ISO 8601. */',
            'export const formatDate = (date: Date): string => date.toISOString();',
          ].join('\n')
        )
      ).toEqual([]);
    });

    it('a local function named in export { … } or export default is exported', () => {
      const violations = judge(
        'export-list.ts',
        [
          "import { x } from './x';",
          'function listed(): void {}',
          'const renamed = (): void => {};',
          'function byDefault(): void {}',
          'export { listed, renamed as alias };',
          'export default byDefault;',
        ].join('\n')
      );
      expect(violations).toEqual([
        expect.stringMatching(/:2: exported function listed /),
        expect.stringMatching(/:3: exported function renamed /),
        expect.stringMatching(/:4: exported function byDefault /),
      ]);
    });
  });

  describe('what is not judged', () => {
    it('a function or class the file does not export is not judged', () => {
      expect(
        judge(
          'internal.ts',
          [
            "import { x } from './x';",
            'function helper(): number { return 1; }',
            'const other = (): number => 2;',
            'class Internal {',
            '  run(): void {}',
            '}',
            'export const VALUE = helper() + other() + new Internal().constructor.length;',
          ].join('\n')
        )
      ).toEqual([]);
    });

    it('methods, interfaces, types, enums and non-function constants are not judged', () => {
      expect(
        judge(
          'not-judged.ts',
          [
            "import { x } from './x';",
            '/** Documented class; its methods are not judged. */',
            'export class Svc {',
            '  public doA(): void {}',
            '  private doB(): number { return 1; }',
            '}',
            'export interface Shape { a: string }',
            'export type Id = string;',
            'export enum Mode { A, B }',
            'export const LIMIT = 10;',
            'export const handler = wrap(() => 1);',
          ].join('\n')
        )
      ).toEqual([]);
    });

    it('.d.ts files are not judged', () => {
      expect(judge('types.d.ts', 'export declare class Ambient {}\n')).toEqual(
        []
      );
    });
  });

  describe('paths in the messages', () => {
    const undocumented = "import { x } from './x';\nexport class Bare {}\n";

    it('are relative with forward slashes when the root is written with the platform separator', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src', 'deep'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'deep', 'bare.ts'),
        undocumented
      );
      // path.resolve writes the root as the OS does: backslashes on Windows,
      // which is what process.cwd() gives the CLI there.
      const nativeRoot = path.resolve(tempDir);
      const violations =
        CodeDocumentationLaw.check({ ...mockContext, projectRoot: nativeRoot })
          .violations ?? [];
      expect(violations).toEqual([
        expect.stringMatching(/^src\/deep\/bare\.ts:2: exported class Bare /),
      ]);
    });

    it('are relative with forward slashes when the root is written with forward slashes (POSIX style)', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src', 'deep'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'deep', 'bare.ts'),
        undocumented
      );
      const forwardRoot = path.resolve(tempDir).split(path.sep).join('/');
      const violations =
        CodeDocumentationLaw.check({ ...mockContext, projectRoot: forwardRoot })
          .violations ?? [];
      expect(violations).toEqual([
        expect.stringMatching(/^src\/deep\/bare\.ts:2: exported class Bare /),
      ]);
    });
  });

  describe('error handling', () => {
    it('should handle unreadable files gracefully', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      const result = CodeDocumentationLaw.check(mockContext);
      expect(result).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
    });

    it('should return error result on analysis failure', () => {
      const invalidContext = {
        ...mockContext,
        projectRoot: '/nonexistent/path',
      };
      const result = CodeDocumentationLaw.check(invalidContext);
      expect(result).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
    });

    it('a file that does not parse is named as not read, never passed', () => {
      const violations = judge(
        'broken.ts',
        'export class Broken {\n  method( {\n'
      );
      expect(violations).toEqual([
        expect.stringMatching(
          /^src\/broken\.ts: could not be parsed .*NOT read/
        ),
      ]);
    });
  });

  describe('score calculation', () => {
    it('should return 100 when no violations', () => {
      const result = CodeDocumentationLaw.check(mockContext);
      expect(result.passed).toBe(true);
      expect(result.score).toBe(100);
    });

    it('should deduct points for violations', () => {
      const undocumented = Array(10)
        .fill(null)
        .map((_, i) => `export function func${i}() { return ${i}; }`)
        .join('\n');
      const violations = judge('undocumented.ts', undocumented);
      expect(violations).toHaveLength(10);
      expect(CodeDocumentationLaw.check(mockContext).score).toBe(50);
    });

    it('should not go below minimum score', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      for (let i = 0; i < 10; i++) {
        const undocumented = Array(100)
          .fill(null)
          .map((_, j) => `export function func${i}_${j}() { return ${j}; }`)
          .join('\n');
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'src', `file${i}.ts`),
          undocumented
        );
      }
      const result = CodeDocumentationLaw.check(mockContext);
      expect(result.score).toBe(0);
    });
  });

  describe('suggestions', () => {
    it('should include the JSDoc suggestion when violations exist', () => {
      judge('undocumented.ts', 'export class Test {}');
      const result = CodeDocumentationLaw.check(mockContext);
      expect(result.passed).toBe(false);
      expect(result.suggestions).toEqual([
        expect.stringMatching(
          /^Add a JSDoc \/\*\* \*\/ block above each exported class and function/
        ),
      ]);
    });
  });
});
