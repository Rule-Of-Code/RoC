import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { CodeDuplicationControlLaw } from '../../src/checkers/code-quality-laws/code-duplication-control';
import { FileUtils } from '../../src/utils';

/**
 * Whitespace was collapsed BEFORE comments were stripped, so `/\/\/.*$/gm` had
 * no line boundary left to stop at and ate everything from the first `//` to
 * the end of the block — comments and real code alike.
 *
 * Any block whose first line was a `//` comment therefore normalised to the
 * empty string, and every such block collided with every other one. That is how
 * a flat Angular provider array was reported as a duplicate of a route guard:
 * no shared logic, nothing `jscpd` could find, two empty strings meeting in a
 * map.
 *
 * A documented function is the most ordinary shape there is, which is what made
 * this reachable in the first place.
 */
describe('code duplication compares code, not what is left after eating it', () => {
  let root: string;

  const write = (rel: string, content: string): void => {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  };

  const duplicationFindings = (): string[] => {
    const result = CodeDuplicationControlLaw.check({
      projectRoot: root,
      config: FileUtils.getMinimalDefaultConfig(),
      lawId: 'code-duplication-control',
    });
    return (result.violations ?? []).filter(v =>
      /Code duplication found/.test(v)
    );
  };

  const GUARD = [
    '// see the guard doc comment for why this exists at all and more words',
    'export const sessionStartGuard = () => {',
    '  return true;',
    '};',
  ].join('\n');

  const CONFIG = [
    '// providers below, in the order the app needs them at startup here',
    'export const appConfig = {',
    '  providers: [provideRouter(routes), provideHttpClient()],',
    '};',
  ].join('\n');

  const REAL_DUPLICATE = [
    'export function calculateTotalWithTax(items, rate) {',
    '  const sum = items.reduce((a, b) => a + b.price, 0);',
    '  return sum * (1 + rate);',
    '}',
  ].join('\n');

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-dup-'));
    write('package.json', '{"name":"x","version":"1.0.0"}');
  });
  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('does not match two comment-led blocks that share no code', () => {
    write('src/session-start.guard.ts', GUARD);
    write('src/app.config.ts', CONFIG);

    expect(duplicationFindings()).toEqual([]);
  });

  it('does not match a block whose only content is comments', () => {
    const commentsOnly = Array.from(
      { length: 6 },
      (_, i) => `// a line of explanation number ${i} with enough text to count`
    ).join('\n');
    write('src/a.ts', `${commentsOnly}\nexport const a = () => 1;`);
    write('src/b.ts', `${commentsOnly}\nexport const b = () => 2;`);

    expect(duplicationFindings()).toEqual([]);
  });

  /** The red control: real duplication is still the point of the law. */
  it('still reports a genuinely duplicated block', () => {
    write('src/a.ts', REAL_DUPLICATE);
    write('src/b.ts', REAL_DUPLICATE);

    expect(duplicationFindings().length).toBeGreaterThan(0);
  });

  it('still reports duplication when the copies carry different comments', () => {
    write('src/a.ts', `// first copy, documented one way\n${REAL_DUPLICATE}`);
    write('src/b.ts', `// second copy, documented another way\n${REAL_DUPLICATE}`);

    expect(duplicationFindings().length).toBeGreaterThan(0);
  });
});
