/**
 * QA's residuals of #330 on 7.26.7 (#336–#339): the same file content named
 * `hero.component.ts` and `hero.ts` (the Angular 20 CLI default) must get the
 * same verdict; a component that imports a service is not a service; the
 * CLI's own spec name is not a naming defect; an unknown `init --type` is
 * refused.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { AngularTestingExcellenceLaw } from '../../src/checkers/angular-laws/angular-testing-excellence';
import { TimerCleanupLaw } from '../../src/checkers/fe-architecture-laws/timer-cleanup';
import { MemoryManagementLaw } from '../../src/checkers/performance-laws/memory-management';
import { executeInitAction } from '../../src/cli/init-command';
import { AngularDependencyInjectionAnalyzer } from '../../src/utils/angular/angular-dependency-injection/angular-dependency-injection-analyzer';
import { FileNamingValidation } from '../../src/utils/naming/file-naming/file-naming-validation';

const made: string[] = [];
afterAll(() => {
  for (const dir of made) fs.rmSync(dir, { recursive: true, force: true });
});

function fixture(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-336-'));
  made.push(root);
  for (const [name, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    fs.writeFileSync(path.join(root, name), content);
  }
  return root;
}

const config = {
  project: { type: 'angular' },
  ignores: { global: [], tests: [], build: [], design: [] },
  includes: { global: [] },
  thresholds: {},
  laws: {},
};
const ctx = (root: string) => ({ projectRoot: root, config }) as never;
const MANIFEST = JSON.stringify({ name: 'a', dependencies: { '@angular/core': '20.0.0', '@angular/platform-browser': '20.0.0' } });

const LEAKY = [
  "import { Component } from '@angular/core';",
  "@Component({ selector: 'app-hero', template: '<p>{{ n }}</p>' })",
  'export class Hero {',
  '  n = 0;',
  '  constructor() { setInterval(() => this.n++, 1000); }',
  '}',
].join('\n');

const joined = (result: { violations?: string[] }): string => (result.violations ?? []).join('\n');

describe('#336 the same component named hero.ts gets the hero.component.ts verdict', () => {
  it.each([['hero.component.ts'], ['hero.ts']])('Memory Leak Prevention and Timer Cleanup see a leaked timer in %s', name => {
    const root = fixture({ 'package.json': MANIFEST, [`src/app/hero/${name}`]: LEAKY });
    expect(joined(MemoryManagementLaw.check(ctx(root)))).toMatch(new RegExp(`${name.replace('.', '\\.')}: setInterval`));
    expect(joined(TimerCleanupLaw.check(ctx(root)))).toMatch(new RegExp(`${name.replace('.', '\\.')}`));
  });

  it.each([
    ['hero.component.ts', 'hero.component.spec.ts'],
    ['hero.ts', 'hero.spec.ts'],
  ])('Angular Testing Excellence checks %s\'s spec %s for TestBed and ComponentFixture', (source, spec) => {
    const root = fixture({
      'package.json': MANIFEST,
      [`src/app/hero/${source}`]: LEAKY,
      [`src/app/hero/${spec}`]: "describe('Hero', () => { it('renders the hero name', () => { expect(1).toBe(1); }); });\n",
    });
    const text = joined(AngularTestingExcellenceLaw.check(ctx(root)));
    expect(text).toMatch(new RegExp(`Component test missing TestBed configuration: .*${spec.replace(/\./g, '\\.')}`));
    expect(text).toMatch(/Component test missing ComponentFixture/);
  });

  it('control: a spec beside a plain model is not a component spec', () => {
    const root = fixture({
      'package.json': MANIFEST,
      'src/app/hero/hero.model.ts': 'export interface Hero { id: number }\n',
      'src/app/hero/hero.model.spec.ts': "describe('Hero', () => { it('has an id field', () => { expect(1).toBe(1); }); });\n",
    });
    expect(joined(AngularTestingExcellenceLaw.check(ctx(root)))).not.toMatch(/Component test missing/);
  });
});

describe('#337 a component that injects a service is not a service class', () => {
  const run = (files: Record<string, string>) =>
    AngularDependencyInjectionAnalyzer.checkDependencyInjection(fixture({ 'package.json': MANIFEST, ...files }), config as never);
  const COMPONENT = [
    "import { Component, inject } from '@angular/core';",
    "import { HeroService } from './hero.service';",
    "@Component({ selector: 'app-hero', template: '' })",
    'export class Hero { private readonly svc = inject(HeroService); }',
  ].join('\n');

  it.each([['hero.component.ts'], ['hero.ts']])('%s importing HeroService is not "a service without @Injectable"', name => {
    const result = run({
      [`src/app/${name}`]: COMPONENT,
      'src/app/hero.service.ts': "import { Injectable } from '@angular/core';\n@Injectable({ providedIn: 'root' })\nexport class HeroService {}\n",
    });
    expect(result.violations.join('\n')).not.toMatch(/should have @Injectable/);
  });

  it('control: a service class without @Injectable is still reported', () => {
    const result = run({ 'src/app/hero.service.ts': 'export class HeroService { all() { return []; } }\n' });
    expect(result.violations.join('\n')).toMatch(/hero\.service\.ts.*@Injectable|@Injectable.*hero\.service\.ts/);
  });
});

describe('#338 the Angular CLI spec name follows the Angular naming convention', () => {
  const angularIssue = (file: string) => FileNamingValidation.analyzeFileName(file).some(i => /Angular/i.test(i.issue));
  it.each([['hero.component.spec.ts'], ['hero.service.spec.ts'], ['hero.component.ts'], ['page404.component.ts']])('%s is fine', file => {
    expect(angularIssue(file)).toBe(false);
  });
  it('a name that merely contains "service" is not an Angular file', () => {
    expect(angularIssue('user-services-list.ts')).toBe(false);
  });
  it('control: a non-kebab Angular file name is still reported', () => {
    expect(angularIssue('Hero_Panel.component.ts')).toBe(true);
  });
});

describe('#339 init refuses an unknown --type', () => {
  afterEach(() => {
    process.exitCode = undefined;
  });

  it('exits non-zero, names the valid types and writes nothing', async () => {
    const root = fixture({ 'package.json': MANIFEST });
    const errors: string[] = [];
    const err = jest.spyOn(console, 'error').mockImplementation((...a) => {
      errors.push(a.map(String).join(' '));
    });
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    try {
      const result = await executeInitAction({ quick: true, hooks: false, type: 'ioinc' }, root);
      expect(result.success).toBe(false);
      expect(process.exitCode).toBe(1);
    } finally {
      err.mockRestore();
      log.mockRestore();
    }
    expect(errors.join('\n')).toMatch(/Unknown --type 'ioinc'.*ionic/);
    expect(fs.existsSync(path.join(root, 'ruleofcode.config.json'))).toBe(false);
  });
});

/**
 * #343: found by running the 7.26.9 candidate against the project's own
 * Angular 20 site. `TestBed.createComponent(App)` returns a ComponentFixture;
 * the type is inferred, so a correct spec never writes the word.
 */
describe('#343 a fixture from createComponent() is a fixture', () => {
  const COMPONENT = "@Component({ selector: 'app-root', template: '<h1>x</h1>' })\nexport class App {}\n";
  const check = (spec: string) =>
    joined(
      AngularTestingExcellenceLaw.check(
        ctx(fixture({ 'package.json': MANIFEST, 'src/app/app.ts': COMPONENT, 'src/app/app.spec.ts': spec }))
      )
    );

  it('TestBed.createComponent(App) with no ComponentFixture annotation passes the fixture check', () => {
    const spec =
      "import { TestBed } from '@angular/core/testing';\nimport { App } from './app';\ndescribe('App', () => {\n  it('renders the page title', async () => {\n    await TestBed.configureTestingModule({ imports: [App] }).compileComponents();\n    const fixture = TestBed.createComponent(App);\n    expect(fixture.nativeElement.textContent).toContain('x');\n  });\n});\n";
    expect(check(spec)).not.toMatch(/missing ComponentFixture|missing TestBed/);
  });

  it('Angular Testing Library render() counts for TestBed and the fixture', () => {
    const spec =
      "import { render, screen } from '@testing-library/angular';\nimport { App } from './app';\ndescribe('App', () => {\n  it('renders the page title', async () => {\n    await render(App);\n    expect(screen.getByText('x')).toBeTruthy();\n  });\n});\n";
    expect(check(spec)).not.toMatch(/missing ComponentFixture|missing TestBed/);
  });

  it('control: a spec that never creates the component is still a finding', () => {
    const spec = "describe('App', () => { it('has a name', () => { expect('App').toBe('App'); }); });\n";
    expect(check(spec)).toMatch(/missing ComponentFixture/);
  });
});
