/**
 * Test Coverage counts a source file as covered when a test is named after it
 * OR imports it directly. It used to count the name only, so a file a test
 * imports and exercises under another name was reported as lacking a test.
 *
 * Every case is a real project on disk, judged through the checker the law
 * calls.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { saysJudgedNothing } from '../../../src/utils/judged-nothing';
import * as tsxSource from '../../../src/utils/react/tsx-source';
import { FileUtils } from '../../../src/utils/file-utils';
import { TestFilesExistenceChecker } from '../../../src/utils/testing/test-files-existence-checker';

describe('Test Coverage: a test that imports a file covers it', () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-cov-imports-'));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  const write = (file: string, text: string): void => {
    const full = path.join(root, file);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, text);
  };

  const check = (): { violations: string[]; suggestions: string[] } =>
    TestFilesExistenceChecker.checkTestFilesExistence(
      root,
      FileUtils.getMinimalDefaultConfig()
    );

  const lacking = (result: { violations: string[] }): string | undefined =>
    result.violations.find(v => v.includes('lack corresponding test files'));

  const examples = (result: { suggestions: string[] }): string =>
    result.suggestions.find(s => s.startsWith('Add test files for:')) ?? '';

  it('counts a file a test imports by a relative path, whatever the test is named', () => {
    write('src/pricing.ts', 'export const price = (n: number) => n * 2;');
    write(
      'tests/checkout.test.ts',
      "import { price } from '../src/pricing';\nit('prices', () => expect(price(1)).toBe(2));"
    );

    expect(lacking(check())).toBeUndefined();
  });

  it('does not count a file the test reaches only through another module', () => {
    write('src/a.ts', "import { b } from './b';\nexport const a = () => b();");
    write('src/b.ts', 'export const b = () => 1;');
    write(
      'tests/flow.test.ts',
      "import { a } from '../src/a';\nit('runs', () => expect(a()).toBe(1));"
    );

    const result = check();
    expect(lacking(result)).toMatch(/^1 source files lack/);
    expect(examples(result)).toContain('src/b.ts');
    expect(examples(result)).not.toContain('src/a.ts');
  });

  it('still counts a test named after the file, with no import', () => {
    write('src/clock.ts', 'export const now = () => Date.now();');
    write('src/clock.spec.ts', "it('ticks', () => expect(1).toBe(1));");

    expect(lacking(check())).toBeUndefined();
  });

  it('counts a module a test mocks with jest.mock', () => {
    write('src/mailer.ts', 'export const send = () => true;');
    write(
      'tests/signup.test.ts',
      "jest.mock('../src/mailer', () => ({ send: () => false }));\nit('signs up', () => expect(1).toBe(1));"
    );

    expect(lacking(check())).toBeUndefined();
  });

  it('counts a file a JavaScript test requires', () => {
    write('lib/slug.js', 'module.exports = s => s.toLowerCase();');
    write(
      'test/strings.test.js',
      "const slug = require('../lib/slug');\nit('slugs', () => expect(slug('A')).toBe('a'));"
    );

    expect(lacking(check())).toBeUndefined();
  });

  it('follows a tsconfig paths alias', () => {
    write(
      'tsconfig.json',
      JSON.stringify({
        compilerOptions: { baseUrl: '.', paths: { '@app/*': ['src/*'] } },
      })
    );
    write('src/cart.ts', 'export const total = () => 0;');
    write(
      'tests/cart-flow.test.ts',
      "import { total } from '@app/cart';\nit('totals', () => expect(total()).toBe(0));"
    );

    expect(lacking(check())).toBeUndefined();
  });

  it('does not count an alias no tsconfig declares', () => {
    write('src/cart.ts', 'export const total = () => 0;');
    write(
      'tests/cart-flow.test.ts',
      "import { total } from '@app/cart';\nit('totals', () => expect(total()).toBe(0));"
    );

    expect(lacking(check())).toMatch(/^1 source files lack/);
  });

  it('names only the files no test names or imports, beside files a test imports', () => {
    for (const name of ['one', 'two', 'three', 'four']) {
      write(`src/${name}.ts`, `export const ${name} = 1;`);
    }
    write(
      'tests/all.test.ts',
      "import { one } from '../src/one';\nimport { two } from '../src/two';\nimport { three } from '../src/three';\nit('sums', () => expect(one + two + three).toBe(3));"
    );

    const result = check();
    expect(lacking(result)).toMatch(/^1 source files lack/);
    expect(examples(result)).toBe('Add test files for: src/four.ts');
  });

  it('keeps the ratio as test files per source file, so it adds no new ratio finding', () => {
    // Two tests that import nothing this law can follow (an alias only Jest
    // knows): counted as covered files the ratio would drop from 50% to 0%
    // and fail where it passed. The ratio is unchanged by the import rule.
    for (const name of ['one', 'two', 'three', 'four']) {
      write(`src/${name}.ts`, `export const ${name} = 1;`);
    }
    write(
      'tests/flow-a.test.ts',
      "import { one } from '~/one';\nit('a', () => expect(one).toBe(1));"
    );
    write(
      'tests/flow-b.test.ts',
      "import { two } from '~/two';\nit('b', () => expect(two).toBe(1));"
    );

    const result = check();
    expect(
      result.violations.some(v => v.includes('Low test coverage ratio'))
    ).toBe(false);
    expect(lacking(result)).toMatch(/^4 source files lack/);
  });

  it('without the typescript package, judges by name and says the imports were not read', () => {
    write('src/pricing.ts', 'export const price = (n: number) => n * 2;');
    write('src/clock.ts', 'export const now = () => Date.now();');
    write('src/clock.spec.ts', "it('ticks', () => expect(1).toBe(1));");
    write(
      'tests/checkout.test.ts',
      "import { price } from '../src/pricing';\nit('prices', () => expect(price(1)).toBe(2));"
    );
    const spy = jest.spyOn(tsxSource, 'loadTypeScript').mockReturnValue(null);
    try {
      const result = check();
      const finding = lacking(result) ?? '';
      expect(finding).toMatch(/^1 source files lack corresponding test files/);
      expect(finding).toMatch(
        /could not load the 'typescript' package .* were NOT read/
      );
      expect(examples(result)).toContain('src/pricing.ts');
      // The name rule WAS judged: the result is a finding, not "judged nothing".
      expect(saysJudgedNothing({ violations: result.violations })).toBe(false);
    } finally {
      spy.mockRestore();
    }
  });

  it('without the typescript package, adds no note when the name rule covers everything', () => {
    write('src/clock.ts', 'export const now = () => Date.now();');
    write('src/clock.spec.ts', "it('ticks', () => expect(1).toBe(1));");
    const spy = jest.spyOn(tsxSource, 'loadTypeScript').mockReturnValue(null);
    try {
      expect(check().violations).toEqual([]);
    } finally {
      spy.mockRestore();
    }
  });
});
