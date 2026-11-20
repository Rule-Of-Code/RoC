/**
 * #414 — an `ignores.global` entry written as a Windows path, an absolute
 * path, with `./` or with a trailing slash matched nothing, and said nothing.
 *
 * The include side normalised slashes; the ignore side passed the pattern to
 * minimatch raw, and `\` is an escape there. Now every ignores/includes
 * pattern is brought to one form when the config is loaded, and an absolute
 * path outside the project — which can match nothing — is named by the audit.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';

import { ConfigLoader } from '../../src/config/loader';
import {
  absolutePatternsIn,
  normalizePathPattern,
} from '../../src/utils/config/path-patterns';
import { FileUtils } from '../../src/utils/file-utils';
import { spawnSync } from '../../src/utils/child-process';

const CLI = path.resolve(__dirname, '..', '..', 'dist', 'cli.js');

describe('#414 normalizePathPattern: one form for every way of writing it', () => {
  describe.each([
    ['a Windows project root', 'D:/work/proj', 'D:\\work\\proj'],
    ['a POSIX project root', '/home/u/proj', '/home/u/proj'],
  ])('%s', (_label, root, nativeRoot) => {
    it.each([
      ['vendor/**', 'vendor/**'],
      ['./vendor/**', 'vendor/**'],
      ['././vendor/**', 'vendor/**'],
      ['vendor/', 'vendor/**'],
      ['vendor\\**', 'vendor/**'],
      ['vendor\\lib.js', 'vendor/lib.js'],
      ['**/vendor/**', '**/vendor/**'],
      ['!./vendor/keep.js', '!vendor/keep.js'],
    ])('%s → %s', (pattern, expected) => {
      expect(normalizePathPattern(pattern, root)).toBe(expected);
    });

    it('an absolute path inside the project becomes relative to it', () => {
      expect(normalizePathPattern(`${root}/vendor/**`, root)).toBe('vendor/**');
      expect(
        normalizePathPattern(
          `${nativeRoot}${path.sep === '\\' || nativeRoot.includes('\\') ? '\\' : '/'}vendor${nativeRoot.includes('\\') ? '\\' : '/'}**`,
          root
        )
      ).toBe('vendor/**');
      expect(normalizePathPattern(`${root}/`, root)).toBe('**');
    });

    it('an absolute path outside the project is left as written', () => {
      expect(normalizePathPattern('/elsewhere/vendor/**', root)).toBe(
        '/elsewhere/vendor/**'
      );
      // a sibling that only shares the root as a prefix is outside too
      expect(normalizePathPattern(`${root}-old/vendor/**`, root)).toBe(
        `${root}-old/vendor/**`
      );
    });
  });
});

describe('#414 ignores.global excludes vendor/ in every form the issue lists', () => {
  let dir: string;
  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-414-'));
    const write = (rel: string, text: string): void => {
      fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
      fs.writeFileSync(path.join(dir, rel), text);
    };
    write(
      'package.json',
      JSON.stringify({ name: 'ignore-forms', version: '1.0.0' })
    );
    write('src/app.ts', 'export const app = 1;\n');
    write('src/util/helper.ts', 'export const helper = 2;\n');
    write('vendor/lib.js', 'module.exports = 3;\n');
  });
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

  const scanned = (ignores: string[] | null): string[] => {
    const config = path.join(dir, 'ruleofcode.config.json');
    if (ignores === null) fs.rmSync(config, { force: true });
    else
      fs.writeFileSync(
        config,
        JSON.stringify({ ignores: { global: ignores } })
      );
    return FileUtils.scanForFiles(dir, ConfigLoader.load(dir), [
      '.ts',
      '.js',
    ]).map(file =>
      path.relative(dir, path.resolve(dir, file)).replace(/\\/g, '/')
    );
  };

  it('precondition: with no ignore, vendor/lib.js is scanned', () => {
    expect(scanned(null)).toEqual(
      expect.arrayContaining(['vendor/lib.js', 'src/app.ts'])
    );
  });

  const forms = (root: string): Array<[string, string]> => [
    ['vendor/**', 'vendor/**'],
    ['**/vendor/**', '**/vendor/**'],
    ['./vendor/**', './vendor/**'],
    ['vendor/', 'vendor/'],
    ['vendor\\**', 'vendor\\**'],
    ['vendor\\lib.js', 'vendor\\lib.js'],
    ['<root>/vendor/**', `${root.replace(/\\/g, '/')}/vendor/**`],
    [
      '<root with backslashes>\\vendor\\**',
      `${root.replace(/\//g, '\\')}\\vendor\\**`,
    ],
  ];

  it.each(forms('<root>').map(([label]) => [label]))('%s', label => {
    const pattern = forms(dir).find(([l]) => l === label)?.[1] ?? '';
    const files = scanned([pattern]);
    expect(files).not.toContain('vendor/lib.js');
    expect(files).toContain('src/app.ts');
  });
});

describe('#414 an absolute path outside the project is named, not ignored in silence', () => {
  jest.setTimeout(120000);
  let dir: string;
  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-414-out-'));
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({ name: 'outside', version: '1.0.0' })
    );
    fs.mkdirSync(path.join(dir, 'src'));
    fs.writeFileSync(path.join(dir, 'src', 'a.ts'), 'export const a = 1;\n');
  });
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

  const outside = path.join(os.tmpdir(), 'not-this-project', 'vendor', '**');

  it('absolutePatternsIn lists it, and not the one inside the project', () => {
    fs.writeFileSync(
      path.join(dir, 'ruleofcode.config.json'),
      JSON.stringify({ ignores: { global: [outside, `${dir}/src/**`] } })
    );
    const config = ConfigLoader.load(dir);
    expect(config.ignores.global).toContain('src/**');
    expect(absolutePatternsIn(config)).toEqual([['ignores.global', outside]]);
  });

  it('the audit prints a warning that names it', () => {
    if (!fs.existsSync(CLI))
      throw new Error('dist/cli.js missing — run `npm run build` before jest');
    fs.writeFileSync(
      path.join(dir, 'ruleofcode.config.json'),
      JSON.stringify({ ignores: { global: [outside] } })
    );
    const run = spawnSync(process.execPath, [CLI, 'audit', '--json'], {
      cwd: dir,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
    expect(run.stderr).toContain(
      `ignores.global: '${outside}' is an absolute path outside the project`
    );
  });
});
