/**
 * The module mappings behind Capacitor Plugin Stub Has Contract Test, tested
 * where they live: Jest moduleNameMapper and Vitest alias entries read from a
 * script config, and the match of a mapping against a plugin name.
 */
import {
  matches,
  scriptMappings,
  type StubMapping,
} from '../../../src/checkers/capacitor-laws/stub-mappings';
import { loadTypeScript, TsxSource } from '../../../src/utils/react/tsx-source';

const ts = loadTypeScript(process.cwd());
const PUSH = '@capacitor/push-notifications';

const parse = (text: string, file = 'jest.config.ts'): TsxSource => {
  if (!ts) throw new Error('typescript must resolve in the RoC repository');
  return TsxSource.parse(ts, file, text);
};

const mapping = (pattern: string, regex: boolean): StubMapping => ({
  pattern,
  regex,
  stub: 'stub.ts',
  config: 'jest.config.ts',
});

describe('scriptMappings', () => {
  it('a moduleNameMapper held in a same-file const, through `as const`', () => {
    const source = parse(
      [
        `const stubs = { '^${PUSH}$': '<rootDir>/push.stub.ts' } as const;`,
        'export default { moduleNameMapper: stubs };',
      ].join('\n')
    );
    expect(scriptMappings(source, 'jest.config.ts')).toEqual([
      {
        pattern: `^${PUSH}$`,
        regex: true,
        stub: '<rootDir>/push.stub.ts',
        config: 'jest.config.ts',
      },
    ]);
  });

  it('a Vitest alias array: a string find is exact, a regex find keeps its source', () => {
    const source = parse(
      `export default { test: { alias: [{ find: '${PUSH}', replacement: path.resolve('stubs', 'push.ts') }, { find: /^capacitor-app$/, replacement: './app.stub.ts' }] } };`,
      'vitest.config.ts'
    );
    expect(scriptMappings(source, 'vitest.config.ts')).toEqual([
      {
        pattern: PUSH,
        regex: false,
        stub: 'stubs/push.ts',
        config: 'vitest.config.ts',
      },
      {
        pattern: '^capacitor-app$',
        regex: true,
        stub: './app.stub.ts',
        config: 'vitest.config.ts',
      },
    ]);
  });

  it('a mapper built by a call is not read: it is named in unread', () => {
    const unread: string[] = [];
    const source = parse('export default { moduleNameMapper: build() };');
    expect(scriptMappings(source, 'jest.config.ts', unread)).toEqual([]);
    expect(unread).toEqual([
      expect.stringMatching(
        /^jest\.config\.ts:1: moduleNameMapper is `build\(\)`, which this law cannot read/
      ),
    ]);
  });
});

describe('matches', () => {
  it('a regex mapping tests the name; an alias must equal it', () => {
    expect(matches(mapping('^@capacitor/push', true), PUSH)).toBe(true);
    expect(matches(mapping('@capacitor/push', false), PUSH)).toBe(false);
    expect(matches(mapping(PUSH, false), PUSH)).toBe(true);
  });

  it('a pattern that is not a valid regex matches nothing', () => {
    expect(matches(mapping('(', true), PUSH)).toBe(false);
    expect(matches(mapping('', false), PUSH)).toBe(false);
  });
});
