import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { CodeComplexityControlLaw } from '../../src/checkers/code-quality-laws/code-complexity-control';
import { FileUtils } from '../../src/utils';

/**
 * A trailing newline TERMINATES the last line; it does not begin another.
 *
 * `split('\n').length` counted the empty string after the final newline, so
 * every POSIX-conformant file measured one line too long. Three tools disagreed
 * about one file at the boundary: `wc -l` said 300, ESLint's `max-lines: 300`
 * passed it, and this law blocked the commit claiming 301 — a number the
 * developer could not reproduce with any other tool.
 */
describe('a file is as long as wc -l says it is', () => {
  let root: string;

  const write = (rel: string, content: string): void => {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  };

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-lines-'));
    write('package.json', '{"name":"x","version":"1.0.0"}');
  });
  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  const linesOf = (count: number): string =>
    Array.from({ length: count }, (_, i) => `export const v${i} = ${i};`).join(
      '\n'
    );

  const tooLongFindings = (): string[] => {
    const result = CodeComplexityControlLaw.check({
      projectRoot: root,
      config: FileUtils.getMinimalDefaultConfig(),
      lawId: 'code-complexity-control',
    });
    return (result.violations ?? []).filter(v => /File too long/.test(v));
  };

  it('says nothing about a file at exactly the limit', () => {
    write('src/f.ts', `${linesOf(300)}\n`);

    expect(tooLongFindings()).toEqual([]);
  });

  it('says nothing about a file one under the limit', () => {
    write('src/f.ts', `${linesOf(299)}\n`);

    expect(tooLongFindings()).toEqual([]);
  });

  /** The red control, and the number it reports must be right. */
  it('reports a file one over the limit, with the real count', () => {
    write('src/f.ts', `${linesOf(301)}\n`);

    expect(tooLongFindings()[0]).toMatch(/\(301 lines, max 300\)/);
  });

  it('counts a file with no trailing newline the same way', () => {
    write('src/f.ts', linesOf(301));

    expect(tooLongFindings()[0]).toMatch(/\(301 lines, max 300\)/);
  });

  it('does not call an empty file one line long', () => {
    write('src/f.ts', '');

    expect(tooLongFindings()).toEqual([]);
  });
});
