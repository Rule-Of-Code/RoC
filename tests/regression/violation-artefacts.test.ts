import chalk from 'chalk';

import { RuleOfCodeAuditor } from '../../src/core/auditing/audit-engine';
import { PathOperations } from '../../src/utils/path-operations';

const REAL_PROJECT_ROOT = PathOperations.resolve(__dirname, '..', '..');

/**
 * A violation named a count and never the artefacts.
 *
 * The laws were not the problem — most of them already compute the file names
 * and put them in `suggestions`. The renderer printed `violations` and dropped
 * `suggestions` on the floor, so "21 source files lack corresponding test
 * files" was the whole of what a consumer got. One of them reimplemented the
 * law's discovery in a script to find out which files it meant, got a different
 * number, could not tell which of the two was wrong, and parked the law.
 *
 * That is the failure mode worth a regression test: an unexplained violation
 * pushes a project toward a waiver rather than a fix.
 */
describe('a failing law shows what it is objecting to', () => {
  const plain = new chalk.Instance({ level: 0 });
  let lines: string[];
  let logSpy: jest.SpyInstance;

  const render = (
    lawResult: Record<string, unknown>,
    verbose = false
  ): string => {
    const auditor = new RuleOfCodeAuditor({}, REAL_PROJECT_ROOT);
    (
      auditor as unknown as {
        displayFailedLaw: (
          r: unknown,
          n: number,
          c: unknown,
          o: { verbose: boolean; showScoring: boolean }
        ) => void;
      }
    ).displayFailedLaw(lawResult, 1, plain, { verbose, showScoring: false });
    return lines.join('\n');
  };

  beforeEach(() => {
    lines = [];
    logSpy = jest
      .spyOn(console, 'log')
      .mockImplementation((...args: unknown[]) => {
        lines.push(args.map(String).join(' '));
      });
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('prints the file names the law computed', () => {
    const output = render({
      lawName: 'Test Coverage Constitutional Standard',
      violations: ['4 source files lack corresponding test files'],
      suggestions: ['Add test files for: libs/a/src/x.ts, libs/a/src/y.ts'],
    });

    expect(output).toContain('4 source files lack corresponding test files');
    expect(output).toContain('libs/a/src/x.ts');
    expect(output).toContain('libs/a/src/y.ts');
  });

  it('truncates a long suggestion list and says how to see the rest', () => {
    const output = render({
      lawName: 'Some Law',
      violations: ['1 problem'],
      suggestions: ['one', 'two', 'three', 'four', 'five'],
    });

    expect(output).toContain('one');
    expect(output).toContain('three');
    expect(output).not.toContain('five');
    expect(output).toContain('--verbose');
    expect(output).toContain('--export json');
  });

  it('shows every suggestion under --verbose', () => {
    const output = render(
      {
        lawName: 'Some Law',
        violations: ['1 problem'],
        suggestions: ['one', 'two', 'three', 'four', 'five'],
      },
      true
    );

    expect(output).toContain('five');
    expect(output).not.toContain('and 2 more');
  });

  it('says nothing extra when the law offered no suggestions', () => {
    const output = render({
      lawName: 'Some Law',
      violations: ['1 problem'],
      suggestions: [],
    });

    expect(output).not.toContain('What the law is asking for');
  });

  it('still prints the affected-file details when a law provides them', () => {
    const output = render({
      lawName: 'Some Law',
      violations: ['1 problem'],
      violationDetails: [{ file: 'src/a.ts', line: 12, message: 'bad thing' }],
      suggestions: [],
    });

    expect(output).toContain('src/a.ts');
    expect(output).toContain('12');
  });
});