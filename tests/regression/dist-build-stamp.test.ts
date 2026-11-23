/**
 * #586: the tests that run dist/cli.js checked only that the file exists, so
 * a dist/ built from older src/ ran in their place — a correct change failed,
 * a broken one could pass. `npm run build` writes a stamp of what it built
 * from (the content of src/ and tsconfig.json), and `builtCli()` refuses a
 * dist/ whose stamp does not match. Content, not mtime: a checkout that leaves
 * the content as it was does not trip it.
 */
import fs from 'fs';
import path from 'path';
import { builtCli } from '../helpers/built-cli';
import { makeTempDir } from '../helpers/temp-dirs';

interface BuildStamp {
  writeStamp: (root: string) => { hash: string; files: number };
}
// eslint-disable-next-line @typescript-eslint/no-var-requires
const stamp = require('../../scripts/build-stamp') as BuildStamp;

const STALE = 'dist/ was built from a different src/ — run npm run build';

/** A tree with src/, tsconfig.json and a built dist/cli.js, stamped as built. */
function builtTree(): string {
  const root = makeTempDir('roc-stamp-');
  for (const [name, text] of Object.entries({
    'src/cli.ts': 'export const run = (): number => 0;\n',
    'src/laws/law.ts': 'export const law = 1;\n',
    'tsconfig.json': '{ "compilerOptions": { "outDir": "dist" } }\n',
    'dist/cli.js': 'exports.run = () => 0;\n',
  })) {
    fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    fs.writeFileSync(path.join(root, name), text);
  }
  stamp.writeStamp(root);
  return root;
}

describe('the CLI tests refuse a dist/ built from a different src/ (#586)', () => {
  it('a build that matches src/ is run', () => {
    const root = builtTree();

    expect(builtCli(root)).toBe(path.join(root, 'dist', 'cli.js'));
  });

  it('src/ changed without a build is refused with the reason', () => {
    const root = builtTree();
    fs.writeFileSync(
      path.join(root, 'src/laws/law.ts'),
      'export const law = 2;\n'
    );

    expect(() => builtCli(root)).toThrow(STALE);
  });

  it('a file added to src/ without a build is refused too', () => {
    const root = builtTree();
    fs.writeFileSync(path.join(root, 'src/new.ts'), 'export {};\n');

    expect(() => builtCli(root)).toThrow(STALE);
  });

  it('building again after the change is run', () => {
    const root = builtTree();
    fs.writeFileSync(
      path.join(root, 'src/laws/law.ts'),
      'export const law = 2;\n'
    );
    stamp.writeStamp(root);

    expect(builtCli(root)).toBe(path.join(root, 'dist', 'cli.js'));
  });

  it('a checkout that leaves the content as it was is run (new mtimes, CRLF)', () => {
    const root = builtTree();
    const file = path.join(root, 'src/cli.ts');
    fs.writeFileSync(file, 'export const run = (): number => 0;\r\n');
    const later = new Date(Date.now() + 60_000);
    fs.utimesSync(file, later, later);

    expect(builtCli(root)).toBe(path.join(root, 'dist', 'cli.js'));
  });

  it('a dist/ without a stamp, or without the CLI, is refused', () => {
    const unstamped = builtTree();
    fs.rmSync(path.join(unstamped, 'dist', '.build-stamp.json'));
    const unbuilt = builtTree();
    fs.rmSync(path.join(unbuilt, 'dist', 'cli.js'));

    expect(() => builtCli(unstamped)).toThrow(
      'dist/ has no build stamp — run npm run build'
    );
    expect(() => builtCli(unbuilt)).toThrow(
      'dist/cli.js missing — run npm run build'
    );
  });
});
