/**
 * #513 (Test Data Management) — text inside fixture strings was judged as
 * test code. A test that hands a detector source code as a string —
 * `'<Script>{`window.x = 1`}</Script>'` — was reported for shared mutable
 * state it does not have, and for having no beforeEach/afterEach to reset
 * it. The same code outside a string is still reported. (Hardcoded test data
 * inside fixture strings is #426.)
 */
import fs from 'fs';
import os from 'os';
import path from 'path';

import { ConfigLoader } from '../../src/config/loader';
import { TestDataManagementLaw } from '../../src/laws/testing/test-data-management';
import { UnitTestDataManagementConstants as C } from '../../src/laws/testing/unit-test-data-management/constants/data-management';

const SHARED = 'Tests have shared mutable state issues';
const NO_RESET = 'Test files share module-scope mutable state';

describe('#513 Test Data Management judges shared state in code, not in strings', () => {
  const dirs: string[] = [];
  afterAll(() => {
    for (const d of dirs) fs.rmSync(d, { recursive: true, force: true });
  });

  /** The law's findings for a project holding one test file. */
  const findings = (testFile: string): string[] => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-513-tdm-'));
    dirs.push(dir);
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({ name: 'tdm-513', version: '1.0.0' })
    );
    fs.mkdirSync(path.join(dir, 'src'));
    fs.writeFileSync(path.join(dir, 'src', 'detector.test.ts'), testFile);
    const result = TestDataManagementLaw.check({
      projectRoot: dir,
      config: ConfigLoader.load(dir),
    });
    return result.violations ?? [];
  };

  /** A spec around the given lines, so the file has a test structure. */
  const spec = (...lines: string[]): string =>
    [
      "import { detect } from './detector';",
      ...lines,
      "describe('detect', () => {",
      "  it('reads the fixture', () => {",
      '    expect(detect(fixture)).toEqual([]);',
      '  });',
      '});',
      '',
    ].join('\n');

  const shared = (v: string[]): string[] => v.filter(x => x.startsWith(SHARED));
  const noReset = (v: string[]): string[] =>
    v.filter(x => x.startsWith(NO_RESET));

  describe('a fixture string is text: no finding', () => {
    it('does not report window.x = 1 inside a template in a JSX string', () => {
      const v = findings(
        spec('const fixture = \'<Script id="init">{`window.x = 1`}</Script>\';')
      );
      expect(shared(v)).toEqual([]);
      expect(noReset(v)).toEqual([]);
    });

    it('does not report window.onerror = assigned inside a template literal', () => {
      const v = findings(
        spec('const fixture = `', 'window.onerror = function () {};', '`;')
      );
      expect(shared(v)).toEqual([]);
      expect(noReset(v)).toEqual([]);
    });

    it('does not report a module let or global assignment inside a template', () => {
      const v = findings(
        spec(
          'const fixture = `',
          'let counter = 0;',
          'global.cache = {};',
          '`;'
        )
      );
      expect(shared(v)).toEqual([]);
      expect(noReset(v)).toEqual([]);
    });

    it('does not report shared state written in a comment', () => {
      const v = findings(
        spec('/* window.x = 1; */', '// global.y = 2;', "const fixture = 'a';")
      );
      expect(shared(v)).toEqual([]);
    });
  });

  describe('the same code outside a string is still reported', () => {
    it('reports a real top-level window.x = 1, and that nothing resets it', () => {
      const v = findings(spec('window.x = 1;', "const fixture = 'a';"));
      expect(shared(v)).toHaveLength(1);
      expect(noReset(v)).toHaveLength(1);
    });

    it('reports a module-scope let', () => {
      const v = findings(spec('let fixture = 1;'));
      expect(shared(v)).toHaveLength(1);
    });

    it('reports a global assignment beside a fixture string', () => {
      const v = findings(
        spec('global.cache = {};', "const fixture = 'window.x = 1';")
      );
      expect(shared(v)).toHaveLength(1);
    });
  });

  describe('the constant judges code the same way', () => {
    it('drops shared state that is only in a string, keeps it in code', () => {
      expect(C.hasSharedMutableState("const f = 'window.x = 1';")).toBe(false);
      expect(C.hasSharedMutableState('const f = `\nlet y = 2;\n`;')).toBe(
        false
      );
      expect(C.hasSharedMutableState('window.x = 1;')).toBe(true);
      expect(C.hasSharedMutableState('let y = 2;')).toBe(true);
    });
  });
});
