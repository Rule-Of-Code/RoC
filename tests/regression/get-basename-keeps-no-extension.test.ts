/**
 * #369 — `PathOperations.getBasename(p)` is the file name WITHOUT its
 * extension (`path.parse(p).name`). Sites that tested that result for an
 * extension could never see one. Each row: reachability first (a fixture
 * through the real, registered law, selected for that project with a default
 * config), then red/green. A row whose code no registered law reaches is
 * proven unreachable and documented as such.
 *
 * Rows 1–7 are the issue's; rows 8–10 were found by the class guard at the
 * bottom (the same defect on other lines). The fix moves each site to
 * `PathOperations.getFilename` (the name with its extension); `getBasename`
 * itself is unchanged — other laws compare the name without its extension.
 */
import path from 'path';
import { ConfigLoader } from '../../src/config/loader';
import { ALL_ENHANCED_CONSTITUTIONAL_LAWS } from '../../src/data/enhanced-laws';
import { ModularLawsRegistry } from '../../src/registry/modular-laws-registry';
import { GenericAngularLaw } from '../../src/checkers/angular-laws/generic-angular';
import { TestCoverageRequirementsLaw } from '../../src/checkers/testing-laws/test-coverage-requirements';
import { CheckerUtils } from '../../src/utils/checker-utils';
import {
  lawAppliesToProjectType,
  runsWithoutAllowlist,
} from '../../src/utils/law-identity';
import { lawRequirementsMet } from '../../src/utils/law-requirements';
import { ProjectTypeDetector } from '../../src/utils/config/project-type-detector';
import { project, removeProjects } from '../checkers/toolkit-fixture';
import { extensionChecksOnBasename } from './get-basename-extension-guard';
import type { LawResult } from '../../src/types/law.types';

afterAll(removeProjects);

const pkg = (dependencies: Record<string, string>): string =>
  JSON.stringify({
    name: 'neutral-fixture',
    version: '1.0.0',
    dependencies,
    devDependencies: { typescript: '5.6.3' },
  });
const TS = {
  'package.json': pkg({}),
  'tsconfig.json': JSON.stringify({ compilerOptions: { strict: true } }),
};
const ANGULAR = {
  'package.json': pkg({
    '@angular/core': '20.0.0',
    '@angular/router': '20.0.0',
    rxjs: '7.8.1',
  }),
  'tsconfig.json': JSON.stringify({ compilerOptions: { strict: true } }),
};
const NGRX = {
  ...ANGULAR,
  'package.json': pkg({
    '@angular/core': '20.0.0',
    rxjs: '7.8.1',
    '@ngrx/store': '20.0.0',
    '@ngrx/effects': '20.0.0',
  }),
};

const law = (title: string) => {
  const found = ModularLawsRegistry.getAll().find(l => l.name === title);
  if (!found) throw new Error(`no law titled ${title}`);
  return found;
};

/** The engine selects `title` for this project with a default config: stack and `requires` gates. */
function selectedFor(root: string, title: string): boolean {
  const l = law(title);
  // The engine's rule: a configured type wins, except `generic`, then the detector.
  const config = ConfigLoader.loadConfig(root);
  const configured = config.project?.type;
  const type =
    configured && configured !== 'generic'
      ? configured
      : (ProjectTypeDetector.detectProjectType(root) ?? configured);
  return (
    runsWithoutAllowlist(
      l,
      (config.laws as { severity?: Record<string, unknown> }).severity
    ) &&
    lawAppliesToProjectType(l.stack, type, root, l) &&
    lawRequirementsMet(l.requires, root)
  );
}

async function run(
  title: string,
  files: Record<string, string>
): Promise<{ result: LawResult; root: string }> {
  const root = project(files);
  expect(selectedFor(root, title)).toBe(true);
  const result = await law(title).check(root, ConfigLoader.loadConfig(root));
  return { result, root };
}
const violations = (result: LawResult): string[] =>
  (result.violations ?? []).map(String);

describe('#369 rows reachable from a registered law: red on 7.27.0, green now', () => {
  it('row 1 — Error Handling Standards sees the source files (a JSON.parse with no try is reported)', async () => {
    // Opt-in since #390: turned on the way a project does, by laws.severity.
    const ON = {
      ...TS,
      'ruleofcode.config.json': JSON.stringify({
        laws: { severity: { 'Error Handling Standards': 'warning' } },
      }),
    };
    const bad = await run('Error Handling Standards', {
      ...ON,
      'src/store.ts':
        'export const load = (raw: string): unknown => JSON.parse(raw);\n',
    });
    expect(violations(bad.result)).toContain(
      '1 critical areas missing try-catch blocks'
    );
    const good = await run('Error Handling Standards', {
      ...ON,
      'src/store.ts':
        'export const load = (raw: string): unknown => {\n  try {\n    return JSON.parse(raw);\n  } catch (error) {\n    return null;\n  }\n};\n',
    });
    expect(violations(good.result)).not.toContain(
      '1 critical areas missing try-catch blocks'
    );
  }, 60000);

  it('row 2 — TODO Management Standards reads the code files (an unreferenced TODO is reported)', async () => {
    const bad = await run('TODO Management Standards', {
      ...TS,
      'src/a.ts': '// TODO: fix this later\nexport const a = 1;\n',
    });
    expect(bad.result.passed).toBe(false);
    expect(violations(bad.result).join('\n')).toMatch(/TODO/);
    const none = await run('TODO Management Standards', {
      ...TS,
      'src/a.ts': 'export const a = 1;\n',
    });
    expect(none.result.passed).toBe(true);
  }, 60000);

  it('row 3 — Bundle Size Optimization sees loadChildren in a routing file (the false "without lazy loading" is gone)', async () => {
    const heavy = {
      ...ANGULAR,
      'package.json': pkg({
        '@angular/core': '20.0.0',
        '@angular/router': '20.0.0',
        rxjs: '7.8.1',
        lodash: '4.17.21',
      }),
    };
    const routing =
      "import { Routes } from '@angular/router';\nexport const routes: Routes = [{ path: 'feature', loadChildren: './feature/feature.module#FeatureModule' }];\n";
    const lazy = await run('Bundle Size Optimization', {
      ...heavy,
      'src/app/app-routing.module.ts': routing,
    });
    expect(
      violations(lazy.result).filter(v => v.includes('without lazy loading'))
    ).toEqual([]);
    const eager = await run('Bundle Size Optimization', {
      ...heavy,
      'src/app/app-routing.module.ts':
        "import { Routes } from '@angular/router';\nexport const routes: Routes = [];\n",
    });
    expect(
      violations(eager.result).some(v => v.includes('without lazy loading'))
    ).toBe(true);
  }, 60000);

  it('row 4 — NgRx RxJS Operators Selection Mandate sees *.effects.ts (a missing @Injectable is reported)', async () => {
    const effects =
      "import { createEffect } from '@ngrx/effects';\nexport class UserEffects {\n  load$ = createEffect(() => this.actions$);\n}\n";
    const bad = await run('NgRx RxJS Operators Selection Mandate', {
      ...NGRX,
      'src/app/user.effects.ts': effects,
    });
    expect(violations(bad.result)).toContain(
      'Missing @Injectable decorator in user.effects'
    );
  }, 60000);

  it("row 10 — the same law's error-handling pass sees *.effects.ts too (found by the guard)", async () => {
    const effects =
      "import { Injectable } from '@angular/core';\nimport { createEffect } from '@ngrx/effects';\nimport { switchMap } from 'rxjs';\n@Injectable()\nexport class UserEffects {\n  load$ = createEffect(() => this.actions$.pipe(switchMap(() => this.api.load())));\n}\n";
    const bad = await run('NgRx RxJS Operators Selection Mandate', {
      ...NGRX,
      'src/app/user.effects.ts': effects,
    });
    expect(violations(bad.result)).toContain(
      'Missing error handling (catchError) in user.effects'
    );
  }, 60000);

  it('row 9 — a ".old." template backup is skipped by the trackBy check (found by the guard)', async () => {
    const files = {
      ...ANGULAR,
      'src/app/list.component.old.html':
        '<li *ngFor="let item of items">{{ item }}</li>\n',
    };
    const backup = await run('Lazy Loading Implementation', files);
    expect(
      violations(backup.result).filter(v => v.includes('list.component.old'))
    ).toEqual([]);
    const live = await run('Lazy Loading Implementation', {
      ...ANGULAR,
      'src/app/list.component.html':
        '<li *ngFor="let item of items">{{ item }}</li>\n',
    });
    expect(
      violations(live.result).some(v =>
        v.includes('Templates missing trackBy functions: list.component')
      )
    ).toBe(true);
  }, 60000);
});

describe('#369 rows no registered law reaches — proven, documented, fixed in place', () => {
  /** The checker classes that some law's checkFunction resolves to. */
  const reached = new Set(
    ALL_ENHANCED_CONSTITUTIONAL_LAWS.map(
      l =>
        (ModularLawsRegistry.LAW_CLASS_MAPPING as Record<string, unknown>)[
          l.checkFunction as string
        ]
    )
  );

  it('row 5 — GenericAngularLaw: no law resolves to it (only the unused AngularChecker fallback); the naming check now sees the extension', () => {
    expect(reached.has(GenericAngularLaw)).toBe(false);
    const fs = jest.requireActual<typeof import('fs')>('fs');
    const src = path.join(__dirname, '..', '..', 'src');
    const users = extensionlessGrep(
      fs,
      src,
      /\bnew AngularChecker\b|AngularChecker\./
    );
    expect(users).toEqual([]);
    // In place: a well-named file is no longer reported as badly named.
    const root = project({
      ...ANGULAR,
      'src/app/user.service.ts':
        "import { Injectable } from '@angular/core';\n@Injectable()\nexport class UserService {}\n",
    });
    const result = GenericAngularLaw.check({
      projectRoot: root,
      config: ConfigLoader.loadConfig(root),
    } as never);
    expect(
      violations(result).filter(
        v => v.includes('user.service.ts') && v.includes('naming')
      )
    ).toEqual([]);
  });

  it('rows 7, 8 — TestCoverageRequirementsLaw: no law resolves to it; declaration files are not source, services are critical', () => {
    expect(reached.has(TestCoverageRequirementsLaw)).toBe(false);
    const root = project({
      ...TS,
      'src/types.d.ts': 'export interface A { a: number }\n',
      'src/user.service.ts': 'export const user = 1;\n',
    });
    const result = TestCoverageRequirementsLaw.check({
      projectRoot: root,
      config: ConfigLoader.loadConfig(root),
    } as never);
    const text = violations(result).join('\n');
    expect(text).toContain('Critical files without tests: user.service');
    expect(text).not.toMatch(/types/);
  });

  it('row 6 — Memory Leak Prevention: the scanner it reads never returns a .spec.ts / .test.ts file, so its filter was dead and is gone', async () => {
    const root = project({
      ...ANGULAR,
      'src/app/a.component.ts': 'export class A {}\n',
      'src/app/a.component.spec.ts':
        'describe("a", () => it("x", () => undefined));\n',
      'src/app/b.test.ts': 'export const b = 1;\n',
    });
    const config = ConfigLoader.loadConfig(root);
    const seen = CheckerUtils.findAngularFiles(root, config).map(file =>
      path.basename(file)
    );
    expect(seen).toContain('a.component.ts');
    expect(seen).not.toContain('a.component.spec.ts');
    expect(seen).not.toContain('b.test.ts');
    // Same with includes and ignores configured: test files never come through.
    const configured = {
      ...config,
      includes: { global: ['src/**'] },
      ignores: { global: ['**/*.md'] },
    };
    expect(
      CheckerUtils.findAngularFiles(root, configured as never).map(file =>
        path.basename(file)
      )
    ).toEqual(expect.not.arrayContaining(['a.component.spec.ts', 'b.test.ts']));
    expect(selectedFor(root, 'Memory Leak Prevention')).toBe(true);
  });
});

/** Files under `dir` (recursively) whose text matches `pattern`, minus the class's own file. */
function extensionlessGrep(
  fs: typeof import('fs'),
  dir: string,
  pattern: RegExp
): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...extensionlessGrep(fs, full, pattern));
    else if (
      entry.name.endsWith('.ts') &&
      !full.endsWith(path.join('checkers', 'angular-checker.ts')) &&
      pattern.test(fs.readFileSync(full, 'utf8'))
    ) {
      out.push(full);
    }
  }
  return out;
}

describe('#369 the class guard', () => {
  it('no extension check on a getBasename result anywhere in src/', () => {
    const findings = extensionChecksOnBasename(
      path.join(__dirname, '..', '..', 'src')
    );
    expect(findings.map(f => `${f.file}:${f.line} ${f.text}`)).toEqual([]);
  });
});
