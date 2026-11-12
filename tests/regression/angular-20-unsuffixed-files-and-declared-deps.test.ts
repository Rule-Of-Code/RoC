/**
 * #330: Angular 20 dropped the `*.component.ts` suffix — `ng generate
 * component hero` writes `hero.ts`. Professional Component Testing kept its
 * own suffix regex, found no component and judged nothing (an error on every
 * app made by the CLI), and the laws that picked files with
 * `endsWith('.component.ts')` passed Angular 20 code in silence.
 *
 * #331: `minimatch` was required by the compiled package without being a
 * dependency; it resolved only because `glob` hoisted it, so a nested install
 * failed with "Cannot find module 'minimatch'".
 */
import fs from 'fs';
import { builtinModules } from 'module';
import os from 'os';
import path from 'path';
import { FunctionalIoQueryApiLaw } from '../../src/checkers/angular-laws/functional-io-query-api';
import { InjectOverConstructorDiLaw } from '../../src/checkers/angular-laws/inject-over-constructor-di';
import { ProfessionalComponentTestingPolicyLaw } from '../../src/laws/testing/professional-component-testing-policy';
import { AngularComponentFiles } from '../../src/utils/angular-component-files';

const made: string[] = [];
afterAll(() => {
  for (const dir of made) fs.rmSync(dir, { recursive: true, force: true });
});

function fixture(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-330-'));
  made.push(root);
  for (const [name, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    fs.writeFileSync(path.join(root, name), content);
  }
  return root;
}

const ctx = (root: string) =>
  ({
    projectRoot: root,
    config: {
      project: { type: 'angular' },
      ignores: { global: [], tests: [], build: [], design: [] },
      includes: { global: [] },
      thresholds: {},
      laws: {},
    },
  }) as never;

const MANIFEST = JSON.stringify({ name: 'a', dependencies: { '@angular/core': '20.0.0' } });
const BAD_COMPONENT = [
  "import { Component, Input } from '@angular/core';",
  "import { HeroService } from './hero-service';",
  "@Component({ selector: 'app-hero', template: '<p>{{ name }}</p>' })",
  'export class Hero {',
  '  @Input() name = "";',
  '  constructor(private readonly heroes: HeroService) {}',
  '}',
].join('\n');

describe('Angular 20 files without a suffix are read (#330)', () => {
  it.each([
    ['hero.ts with @Component', 'src/app/hero.ts', '@Component({ selector: "x", template: "" })\nexport class Hero {}', ['component'], true],
    ['highlight.ts with @Directive', 'src/app/highlight.ts', '@Directive({ selector: "[x]" })\nexport class Highlight {}', ['directive'], true],
    ['user-service.ts with @Injectable', 'src/app/user-service.ts', '@Injectable({ providedIn: "root" })\nexport class UserService {}', ['service'], true],
    ['auth-guard.ts as a functional guard', 'src/app/auth-guard.ts', 'export const authGuard: CanActivateFn = () => true;', ['guard'], true],
    ['a plain model', 'src/app/user.ts', 'export interface User { id: number }', ['component', 'directive', 'service'], false],
    ['a spec is never a source', 'src/app/hero.spec.ts', '@Component({ selector: "x", template: "" })\nexport class Hero {}', ['component'], false],
  ])('%s', (_label, file, content, kinds, expected) => {
    const root = fixture({ [file]: content });
    expect(AngularComponentFiles.isKind(path.join(root, file), kinds as never)).toBe(expected);
  });

  it('Inject Over Constructor DI and Functional IO Query API judge hero.ts', () => {
    const root = fixture({ 'package.json': MANIFEST, 'src/app/hero.ts': BAD_COMPONENT });
    expect(InjectOverConstructorDiLaw.check(ctx(root)).passed).toBe(false);
    expect(FunctionalIoQueryApiLaw.check(ctx(root)).passed).toBe(false);
  });

  it('Professional Component Testing finds hero.ts and pairs it with hero.spec.ts', () => {
    const untested = ProfessionalComponentTestingPolicyLaw.check(
      ctx(fixture({ 'package.json': MANIFEST, 'src/app/hero.ts': BAD_COMPONENT }))
    );
    const joined = (untested.violations ?? []).join('\n');
    expect(joined).not.toMatch(/found no component files/);
    expect(untested.passed).toBe(false);

    const tested = ProfessionalComponentTestingPolicyLaw.check(
      ctx(
        fixture({
          'package.json': MANIFEST,
          'src/app/hero.ts': BAD_COMPONENT,
          'src/app/hero.spec.ts': "describe('Hero', () => { it('renders the hero name', () => { expect(1).toBe(1); }); });\n",
        })
      )
    );
    expect((tested.violations ?? []).join('\n')).not.toMatch(/found no component files|missing (?:test|spec)/i);
  });
});

describe('every package the source imports is a declared dependency (#331)', () => {
  it('no runtime import resolves only by hoisting', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf8')) as {
      dependencies: Record<string, string>;
    };
    const declared = new Set(Object.keys(pkg.dependencies));
    const builtins = new Set(builtinModules.flatMap(m => [m, `node:${m}`]));
    // Loaded from the AUDITED project at run time (require.resolve with its
    // paths), never from this package.
    const projectProvided = new Set(['typescript']);
    const missing = new Set<string>();
    const walk = (dir: string): void => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith('.ts')) {
          const text = fs.readFileSync(full, 'utf8');
          const specifiers = [
            ...text.matchAll(/^\s*import\s+(?!type\b)[^'";]*?from\s+['"]([^'"]+)['"]/gm),
            ...text.matchAll(/^\s*import\s+['"]([^'"]+)['"]/gm),
          ].map(m => m[1] ?? '');
          for (const spec of specifiers) {
            if (spec.startsWith('.') || builtins.has(spec)) continue;
            const name = spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : (spec.split('/')[0] ?? spec);
            if (!declared.has(name) && !projectProvided.has(name) && !builtins.has(name)) missing.add(name);
          }
        }
      }
    };
    walk(path.join(__dirname, '../../src'));
    expect([...missing].sort()).toEqual([]);
  });
});

/**
 * #332: `init` wrote ruleofcode.config.js while the README, the guides and the
 * templates say ruleofcode.config.json — the README's `--config
 * ruleofcode.config.json` pointed at a file that did not exist. And
 * `init --quick --type` was accepted and ignored.
 */
describe('init writes ruleofcode.config.json and honours --type (#332)', () => {
  const quiet = (): (() => void) => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    return () => spy.mockRestore();
  };

  it('quick mode writes ruleofcode.config.json, never .js', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { setupQuickMode } = require('../../src/cli/init-helpers');
    const root = fixture({ 'package.json': JSON.stringify({ name: 'a', dependencies: { '@angular/core': '20.0.0' } }) });
    const restore = quiet();
    try {
      await setupQuickMode(root, { hooks: false });
    } finally {
      restore();
    }
    expect(fs.existsSync(path.join(root, 'ruleofcode.config.json'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'ruleofcode.config.js'))).toBe(false);
    expect(JSON.parse(fs.readFileSync(path.join(root, 'ruleofcode.config.json'), 'utf8')).project.type).toBe('angular');
  });

  it.each(['ionic', 'python'])('quick mode honours --type %s', async type => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { setupQuickMode } = require('../../src/cli/init-helpers');
    const root = fixture({ 'package.json': JSON.stringify({ name: 'a' }) });
    const restore = quiet();
    try {
      await setupQuickMode(root, { hooks: false, type });
    } finally {
      restore();
    }
    expect(JSON.parse(fs.readFileSync(path.join(root, 'ruleofcode.config.json'), 'utf8')).project.type).toBe(type);
  });

  it('an old ruleofcode.config.js, which the loader would prefer, is moved aside', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { writeInitConfig } = require('../../src/cli/init-helpers');
    const root = fixture({ 'ruleofcode.config.js': 'module.exports = { project: { type: "node" } };' });
    const restore = quiet();
    try {
      writeInitConfig(root, { project: { type: 'react' } });
    } finally {
      restore();
    }
    expect(fs.existsSync(path.join(root, 'ruleofcode.config.js'))).toBe(false);
    expect(fs.existsSync(path.join(root, 'ruleofcode.config.js.bak'))).toBe(true);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ConfigLoader } = require('../../src/config/loader');
    expect(ConfigLoader.load(root).project.type).toBe('react');
  });
});

/**
 * Found on a real Angular 20 app once unsuffixed files were read: a file that
 * holds an @Injectable class also holds an in-memory fake built with `new`.
 * Its `constructor(readonly seed = {})` is not DI — only a decorated class is
 * constructed by the injector.
 */
describe('Inject Over Constructor DI judges decorated classes, not the file (#330)', () => {
  const FILE = [
    "import { Injectable, inject } from '@angular/core';",
    "import { HttpClient } from '@angular/common/http';",
    'export abstract class Repo { abstract all(): string[]; }',
    'export class InMemoryRepo extends Repo {',
    '  constructor(readonly seed: string[] = []) { super(); }',
    '  all(): string[] { return this.seed; }',
    '}',
    '@Injectable()',
    'export class HttpRepo extends Repo {',
    '  readonly #http = inject(HttpClient);',
    '  all(): string[] { return []; }',
    '}',
  ].join('\n');

  it('a plain class with a parameter property beside an @Injectable class is not a finding', () => {
    const root = fixture({ 'package.json': MANIFEST, 'src/app/repo.repository.ts': FILE, 'node_modules/.keep': '' });
    // typescript resolves from this repository when the fixture has none
    expect(InjectOverConstructorDiLaw.check(ctx(root)).violations ?? []).toEqual([]);
  });

  it('control: constructor DI on the @Injectable class is', () => {
    const bad = FILE.replace('  readonly #http = inject(HttpClient);', '  constructor(private readonly http: HttpClient) { super(); }');
    const root = fixture({ 'package.json': MANIFEST, 'src/app/repo.repository.ts': bad });
    expect((InjectOverConstructorDiLaw.check(ctx(root)).violations ?? []).join('\n')).toMatch(/repo\.repository\.ts: 1 constructor/);
  });
});

/**
 * #335: reading unsuffixed Angular 20 sources made the "substantial app"
 * guard (more than 5 sources) true for the first time, and the e2e lookup
 * behind it read only root-level e2e/, cypress/ and tests/ — so a Playwright
 * suite in Nx's apps/<name>-e2e/ was "No E2E tests found", an error.
 */
describe('e2e specs in apps/<name>-e2e/ are found (#335)', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { AngularTestingExcellenceLaw } = require('../../src/checkers/angular-laws/angular-testing-excellence');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { findE2ESpecs } = require('../../src/utils/testing/e2e-specs');
  const app = (): Record<string, string> => {
    const files: Record<string, string> = { 'package.json': MANIFEST };
    for (let i = 0; i < 7; i++) {
      files[`apps/web/src/app/page${i}.ts`] = `@Component({ selector: 'app-p${i}', template: '' })\nexport class Page${i} {}\n`;
    }
    return files;
  };
  const SPEC = "import { test, expect } from '@playwright/test';\ntest('home renders the title', async ({ page }) => { await expect(page).toHaveTitle(/x/); });\n";
  const e2eFinding = (root: string): boolean =>
    (AngularTestingExcellenceLaw.check(ctx(root)).violations ?? []).some((v: string) => /No E2E tests found/.test(v));

  it('a Playwright suite in apps/web-e2e/src/ counts', () => {
    const root = fixture({ ...app(), 'apps/web-e2e/src/home.spec.ts': SPEC });
    expect(findE2ESpecs(root).map((f: string) => path.basename(f))).toEqual(['home.spec.ts']);
    expect(e2eFinding(root)).toBe(false);
  });

  it('control: the same app with no e2e suite is still a finding', () => {
    expect(e2eFinding(fixture(app()))).toBe(true);
  });

  it('control: a root-level e2e/ suite counts, as before', () => {
    expect(e2eFinding(fixture({ ...app(), 'e2e/home.spec.ts': SPEC }))).toBe(false);
  });
});
