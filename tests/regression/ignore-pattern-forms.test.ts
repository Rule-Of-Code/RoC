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
  literalNamesReadAsClassesIn,
  normalizePathPattern,
} from '../../src/utils/config/path-patterns';
import { FileUtils } from '../../src/utils/file-utils';
import { spawnSync } from '../../src/utils/child-process';
import { builtCli } from '../helpers/built-cli';

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
      // \ escapes a glob character only where it cannot be a separator
      ['weird\\[1\\]/**', 'weird\\[1\\]/**'],
      ['a\\{b,c\\}', 'a\\{b,c\\}'],
      ['x\\(1\\)', 'x\\(1\\)'],
      ['\\!keep', '\\!keep'],
      ['app\\[slug]\\page.tsx', 'app/[slug]/page.tsx'],
      ['app\\[slug]\\[id]\\page.tsx', 'app/[slug]/[id]/page.tsx'],
      ['src\\[a-c]*.ts', 'src/[a-c]*.ts'],
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
    builtCli();
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

describe('#414 a literal [name] is a glob class: excluded as written, and named', () => {
  jest.setTimeout(120000);
  let dir: string;
  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-414-class-'));
    const write = (rel: string, text: string): void => {
      fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
      fs.writeFileSync(path.join(dir, rel), text);
    };
    write(
      'package.json',
      JSON.stringify({ name: 'classes', version: '1.0.0' })
    );
    write('src/app.ts', 'export const app = 1;\n');
    write('weird[1]/brackets.ts', 'export const w = 1;\n');
    write('app/[slug]/page.tsx', 'export const route = 1;\n');
    write('app/s/page.tsx', 'export const decoy = 1;\n'); // what [slug] matches
  });
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

  const load = (ignores: string[]): ReturnType<typeof ConfigLoader.load> => {
    fs.writeFileSync(
      path.join(dir, 'ruleofcode.config.json'),
      JSON.stringify({ ignores: { global: ignores } })
    );
    return ConfigLoader.load(dir);
  };
  const scanned = (ignores: string[]): string[] =>
    FileUtils.scanForFiles(dir, load(ignores), ['.ts', '.tsx']).map(file =>
      path.relative(dir, path.resolve(dir, file)).replace(/\\/g, '/')
    );

  it('precondition: with no ignore, all three are scanned', () => {
    expect(scanned([])).toEqual(
      expect.arrayContaining([
        'weird[1]/brackets.ts',
        'app/[slug]/page.tsx',
        'app/s/page.tsx',
      ])
    );
  });

  it('weird\\[1\\]/** excludes the directory weird[1] (the escape is kept)', () => {
    const files = scanned(['weird\\[1\\]/**']);
    expect(files).not.toContain('weird[1]/brackets.ts');
    expect(files).toContain('src/app.ts');
  });

  it.each([
    ['with /', 'app/[slug]/page.tsx'],
    ['with \\', 'app\\[slug]\\page.tsx'],
  ])(
    '[slug] %s is a class: it excludes app/s, not the route — and is named',
    (_label, pattern) => {
      const files = scanned([pattern]);
      expect(files).not.toContain('app/s/page.tsx');
      expect(files).toContain('app/[slug]/page.tsx');
      expect(literalNamesReadAsClassesIn(load([pattern]), dir)).toEqual([
        ['ignores.global', 'app/[slug]/page.tsx', '[slug]', 'directory'],
      ]);
    }
  );

  it.each([
    ['escaped', 'app/\\[slug\\]/page.tsx'],
    ['as a class of [', 'app/[[]slug]/page.tsx'],
  ])(
    '[slug] %s excludes the route, not app/s — and is not named',
    (_label, pattern) => {
      const files = scanned([pattern]);
      expect(files).not.toContain('app/[slug]/page.tsx');
      expect(files).toContain('app/s/page.tsx');
      expect(literalNamesReadAsClassesIn(load([pattern]), dir)).toEqual([]);
    }
  );

  it('a class that names nothing on disk is not named', () => {
    expect(
      literalNamesReadAsClassesIn(load(['src/[a-c]*.ts', 'app/[x]/**']), dir)
    ).toEqual([]);
  });

  it('includes are judged too', () => {
    fs.writeFileSync(
      path.join(dir, 'ruleofcode.config.json'),
      JSON.stringify({ includes: { global: ['app/[slug]/**'] } })
    );
    expect(literalNamesReadAsClassesIn(ConfigLoader.load(dir), dir)).toEqual([
      ['includes.global', 'app/[slug]/**', '[slug]', 'directory'],
    ]);
  });

  it('the audit prints a warning that names the class and the literal form', () => {
    builtCli();
    load(['app/[slug]/page.tsx']);
    const run = spawnSync(process.execPath, [CLI, 'audit', '--json'], {
      cwd: dir,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
    expect(run.stderr).toContain(
      "ignores.global: 'app/[slug]/page.tsx' — '[slug]' is a glob character class and does not match the directory '[slug]' — write \\[slug\\] for the literal name."
    );
  });
});
