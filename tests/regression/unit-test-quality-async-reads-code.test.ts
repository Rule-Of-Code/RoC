import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { UnitTestQualityLaw } from '../../src/checkers/testing-laws/unit-test-quality';
import { FileUtils } from '../../src/utils';
import * as tsxSource from '../../src/utils/react/tsx-source';

/**
 * Unit Test Quality reads the async patterns of a test from its code (#424).
 *
 * The async analysis ran over the raw file, so a test that keeps the code it
 * feeds a detector as a string — `'fetchUser().then(render)'` — was told its
 * promise chains have no `.catch()`, could use async/await, and use
 * setTimeout without fake timers, although the test itself does none of it.
 */
describe('Unit Test Quality: async patterns from the code (#424)', () => {
  let root: string;

  const write = (rel: string, content: string): void => {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  };

  const ASYNC_FINDINGS =
    /Promise chains|setTimeout usage|Mixing async|Awaiting non-promise|async, mocking and edge-case patterns/;

  const asyncFindings = async (): Promise<string[]> => {
    const result = await UnitTestQualityLaw.check({
      projectRoot: root,
      config: FileUtils.getMinimalDefaultConfig(),
      lawId: 'unit-test-quality-standards',
    });
    return (result.violations ?? []).filter(v => ASYNC_FINDINGS.test(v));
  };

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-utq-'));
    write('package.json', '{"name":"x","version":"1.0.0"}');
  });
  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('does not read the async code a test keeps in strings', async () => {
    write(
      'src/detector.test.ts',
      [
        "import { detect } from './detector';",
        "describe('detector', () => {",
        "  it('flags a chain', () => {",
        "    const input = 'fetchUser().then(render); setTimeout(poll, 10);';",
        '    const done = \'it("x", async (done) => { await go(); done(); })\';',
        '    expect(detect(input + done)).toBe(true);',
        '  });',
        '});',
        '',
      ].join('\n')
    );

    expect(await asyncFindings()).toEqual([]);
  });

  it('still reads them in code', async () => {
    write(
      'src/poll.test.ts',
      [
        "describe('poll', () => {",
        "  it('waits', async () => {",
        '    await new Promise(resolve => setTimeout(resolve, 10));',
        "    await 'ready';",
        '    expect(true).toBe(true);',
        '  });',
        '});',
        '',
      ].join('\n')
    );

    expect(await asyncFindings()).toEqual([
      'setTimeout usage without fake timers may cause test flakiness in src/poll.test.ts',
      'Awaiting non-promise values detected in src/poll.test.ts',
    ]);
  });

  it('says the async patterns were not read without the parser', async () => {
    write('src/a.test.ts', "it('a', () => { expect(1).toBe(1); });\n");
    const spy = jest.spyOn(tsxSource, 'loadTypeScript').mockReturnValue(null);
    try {
      expect(await asyncFindings()).toEqual([
        expect.stringMatching(
          /the async, mocking and edge-case patterns of the 1 test file\(s\) were NOT read/
        ),
      ]);
    } finally {
      spy.mockRestore();
    }
  });
});
