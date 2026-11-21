import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { CentralizedLoggingLaw } from '../../src/checkers/code-quality-laws/centralized-logging';
import { FileUtils } from '../../src/utils';
import * as tsxSource from '../../src/utils/react/tsx-source';

/**
 * Centralized Logging reads console calls from the code (#424), and in a
 * package that declares a `bin` the command's console.log/info are its
 * output, not logging that bypasses a logger (#425).
 *
 * The TypeScript branch stripped comments only, so `console.log(` in a
 * message string was a call; it allowed console output only in files named
 * logger.service.ts or main.ts, so a project's own logging module was
 * reported; and a CLI's report renderer was "logging" on every line.
 */
describe('Centralized Logging: code only, and a CLI prints (#424, #425)', () => {
  let root: string;

  const write = (rel: string, content: string): void => {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  };

  const findings = (): string[] =>
    CentralizedLoggingLaw.check({
      projectRoot: root,
      config: FileUtils.getMinimalDefaultConfig(),
      lawId: 'centralized-logging',
    }).violations ?? [];

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-log-'));
    write('package.json', '{"name":"lib","version":"1.0.0"}');
  });
  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('does not count console.log( inside a string', () => {
    write(
      'src/help.ts',
      "export const HINT = 'replace console.log(x) with logger.info(x)';\n"
    );

    expect(findings()).toEqual([]);
  });

  it("does not count the project's own logging module", () => {
    write(
      'src/logging-utils.ts',
      'export const log = (m: string): void => console.info(m);\n'
    );

    expect(findings()).toEqual([]);
  });

  it('still counts a console call in library code', () => {
    write('src/cache.ts', "export const save = () => console.warn('slow');\n");

    expect(findings()).toEqual([
      'src/cache.ts: 1 direct console.* call(s) — route logging through the logger service.',
    ]);
  });

  describe('in a package that declares a bin', () => {
    beforeEach(() => {
      write(
        'package.json',
        '{"name":"tool","version":"1.0.0","bin":"dist/cli.js"}'
      );
    });

    it('does not count log and info: they are the output', () => {
      write(
        'src/cli/report.ts',
        "export function report(n: number): void {\n  console.log(`${n} files`);\n  console.info('done');\n}\n"
      );

      expect(findings()).toEqual([]);
    });

    /**
     * warn writes to stderr, as error does, and is judged with error: still
     * counted until it is decided whether a CLI's stderr is output too.
     */
    it('still counts warn, as it counts error', () => {
      write(
        'src/cli/report.ts',
        "export function report(n: number): void {\n  console.info(n);\n  console.warn('slow');\n  console.error('failed');\n}\n"
      );

      expect(findings()).toEqual([
        'src/cli/report.ts: 2 direct console.* call(s) — route logging through the logger service.',
      ]);
    });

    it('still counts error, debug and trace', () => {
      write(
        'src/cli/report.ts',
        "export function report(n: number): void {\n  console.log(n);\n  console.debug('[DEBUG]', n);\n}\n"
      );

      expect(findings()).toEqual([
        'src/cli/report.ts: 1 direct console.* call(s) — route logging through the logger service.',
      ]);
    });
  });

  it('says the .ts files were not read without the parser', () => {
    write('src/a.ts', 'export const a = 1;\n');
    const spy = jest.spyOn(tsxSource, 'loadTypeScript').mockReturnValue(null);
    try {
      expect(findings()[0]).toMatch(
        /the 1 \.ts file\(s\) were NOT read.*judged nothing/
      );
    } finally {
      spy.mockRestore();
    }
  });
});
