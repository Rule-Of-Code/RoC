import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { CoverageThresholdReader } from '../../../src/utils/testing/coverage-threshold-reader';

/**
 * The reader exists because two laws each answered "what thresholds does this
 * workspace declare?" with their own text scan, and both were wrong in the same
 * Nx workspace: they joined every config into one blob, anchored on the first
 * `coverageThreshold` and read a fixed window after it, and they required the
 * numbers to be inline literals. These tests pin the three properties that
 * follow from fixing that — read every file, count braces not characters, and
 * follow a named constant.
 */
describe('utils/testing/coverage-threshold-reader', () => {
  let root: string;
  const write = (rel: string, content: string): void => {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  };

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-covthr-'));
  });
  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  describe('blocksFromContent', () => {
    it('reads an inline global block', () => {
      const blocks = CoverageThresholdReader.blocksFromContent(
        `module.exports = { coverageThreshold: { global: { statements: 100, branches: 95, functions: 100, lines: 100 } } };`
      );

      expect(blocks).toEqual([
        { statements: 100, branches: 95, functions: 100, lines: 100 },
      ]);
    });

    it('follows a named constant instead of demanding inline literals', () => {
      const blocks = CoverageThresholdReader.blocksFromContent(
        [
          'const COVERAGE_CONTRACT = {',
          '  statements: 100,',
          '  branches: 100,',
          '  functions: 100,',
          '  lines: 100,',
          '};',
          '',
          'export default {',
          '  coverageThreshold: { global: COVERAGE_CONTRACT },',
          '};',
        ].join('\n')
      );

      expect(blocks).toEqual([
        { branches: 100, functions: 100, lines: 100, statements: 100 },
      ]);
    });

    it('finds a second block far past the first one', () => {
      // The scan this replaced read 800 characters after the FIRST occurrence.
      const filler = `// ${'x'.repeat(2000)}\n`;
      const blocks = CoverageThresholdReader.blocksFromContent(
        `const a = { coverageThreshold: { global: { lines: 60 } } };\n${filler}` +
          `const b = { coverageThreshold: { global: { statements: 100, branches: 100, functions: 100, lines: 100 } } };`
      );

      expect(blocks).toHaveLength(2);
      expect(blocks[1]).toEqual({
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      });
    });

    it('reports nothing when no threshold is declared', () => {
      expect(
        CoverageThresholdReader.blocksFromContent(
          `export default { preset: '../../jest.preset.js' };`
        )
      ).toEqual([]);
    });

    it('reads a package.json block, where the key is quoted', () => {
      const blocks = CoverageThresholdReader.blocksFromContent(
        JSON.stringify({
          name: 'p',
          jest: {
            coverageThreshold: {
              global: {
                lines: 100,
                functions: 100,
                branches: 100,
                statements: 100,
              },
            },
          },
        })
      );

      expect(blocks).toEqual([
        { lines: 100, functions: 100, branches: 100, statements: 100 },
      ]);
    });

    it('does not attach a brace that belongs to a later statement', () => {
      // `coverageThreshold` mentioned but not assigned an object — the next `{`
      // in the file is somebody else's.
      expect(
        CoverageThresholdReader.blocksFromContent(
          `// TODO: coverageThreshold\nfunction f() { const lines = 100; return lines; }`
        )
      ).toEqual([]);
    });
  });

  describe('across an Nx workspace', () => {
    const nxWorkspace = (): void => {
      write(
        'package.json',
        JSON.stringify({ name: 'w', version: '1.0.0', devDependencies: {} })
      );
      write(
        'jest.preset.js',
        [
          "const nxPreset = require('@nx/jest/preset').default;",
          'module.exports = {',
          '  ...nxPreset,',
          '  coverageThreshold: {',
          '    global: {',
          '      statements: 100,',
          '      branches: 100,',
          '      functions: 100,',
          '      lines: 100,',
          '    },',
          '  },',
          '};',
        ].join('\n')
      );
      // Per-project configs that inherit the preset and state no numbers.
      for (const project of [
        'apps/festrr',
        'libs/events/data-access',
        'libs/shared/util',
      ]) {
        write(
          `${project}/jest.config.ts`,
          [
            'export default {',
            `  displayName: '${project}',`,
            "  preset: '../../jest.preset.js',",
            "  setupFilesAfterEach: ['<rootDir>/src/test-setup.ts'],",
            `  coverageDirectory: '../../coverage/${project}',`,
            '  transform: {',
            "    '^.+\\\\.(ts|mjs|js|html)$': ['jest-preset-angular', {}],",
            '  },',
            '};',
          ].join('\n')
        );
      }
    };

    it('finds thresholds stated once in the shared preset', () => {
      nxWorkspace();

      expect(CoverageThresholdReader.lowestThresholds(root)).toEqual({
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      });
      expect(CoverageThresholdReader.mandatesAll(root, 100)).toBe(true);
    });

    it('reaches a library nested two levels deep', () => {
      nxWorkspace();
      write(
        'libs/events/data-access/jest.config.ts',
        `export default { coverageThreshold: { global: { statements: 40, branches: 40, functions: 40, lines: 40 } } };`
      );

      // The weakest declaration is what the workspace actually guarantees.
      expect(CoverageThresholdReader.lowestThresholds(root)).toEqual({
        statements: 40,
        branches: 40,
        functions: 40,
        lines: 40,
      });
      expect(CoverageThresholdReader.mandatesAll(root, 100)).toBe(false);
    });

    it('does not mandate 100 when nothing declares a threshold', () => {
      write(
        'package.json',
        JSON.stringify({ name: 'w', version: '1.0.0', devDependencies: {} })
      );

      expect(CoverageThresholdReader.workspaceBlocks(root)).toEqual([]);
      expect(CoverageThresholdReader.mandatesAll(root, 100)).toBe(false);
    });
  });
});