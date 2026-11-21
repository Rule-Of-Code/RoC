import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { CentralizedLoggingLaw } from '../../src/checkers/code-quality-laws/centralized-logging';
import { FileUtils } from '../../src/utils';
import * as tsxSource from '../../src/utils/react/tsx-source';

/**
 * Centralized Logging reads console calls from the code (#424), and in a
 * package that declares a `bin` the command's console.log/info are its output,
 * and in its entry modules (what `bin` points to, and the command directory)
 * console.warn/error are as well — output, not logging that bypasses a
 * logger (#425).
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

  /** The red control: without a `bin` warn and error are counted. */
  it('counts warn and error outside a package that declares a bin', () => {
    write(
      'src/utils/cache.ts',
      "export function save(ok: boolean): void {\n  if (!ok) console.warn('cache write failed');\n  if (!ok) console.error('cache lost');\n}\n"
    );

    expect(findings()).toEqual([
      'src/utils/cache.ts: 2 direct console.* call(s) — route logging through the logger service.',
    ]);
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
     * Library code the command calls is not the command: an error written
     * there bypasses whatever reports to the user, and is counted.
     */
    it('counts warn and error in a library file of the package', () => {
      write(
        'src/utils/discovery.ts',
        "export function find(n: number): void {\n  console.log('found', n);\n  console.error('[DEBUG] scanned', n);\n  console.warn('slow scan');\n}\n"
      );

      expect(findings()).toEqual([
        'src/utils/discovery.ts: 2 direct console.* call(s) — route logging through the logger service.',
      ]);
    });

    /** dist/cli.js is built from src/cli.ts; its commands live in src/cli/. */
    it('does not count warn and error in the entry module and its commands', () => {
      write(
        'src/cli.ts',
        "export function main(): void {\n  console.error('unknown command');\n}\n"
      );
      write(
        'src/cli/audit-command.ts',
        "export function audit(ok: boolean): void {\n  if (!ok) console.error('Audit failed');\n  console.warn('deprecated flag');\n}\n"
      );

      expect(findings()).toEqual([]);
    });

    it('still counts debug and trace', () => {
      write(
        'src/cli/report.ts',
        "export function report(n: number): void {\n  console.log(n);\n  console.debug('[DEBUG]', n);\n  console.trace('here');\n}\n"
      );

      expect(findings()).toEqual([
        'src/cli/report.ts: 2 direct console.* call(s) — route logging through the logger service.',
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
