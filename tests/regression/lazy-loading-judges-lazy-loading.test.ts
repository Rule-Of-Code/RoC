/**
 * #562 — Lazy Loading Implementation called three analyzers of Change
 * Detection Optimization (components, trackBy, observables) and appended
 * their findings to its own. With no component files the line "No Angular
 * components found" appeared twice and cost 20 points. That class was never
 * a registered law, so its checks lived only there. Decision: Lazy Loading
 * judges lazy loading; the checks move to the laws that own them —
 * `ngDoCheck` to Angular Lifecycle Management, `*ngFor` without `trackBy`
 * below Angular 18 to Modern Angular Control Flow; OnPush and subscriptions
 * were already judged by their own laws.
 */
import { AngularLifecycleManagementLaw } from '../../src/checkers/angular-laws/angular-lifecycle-management';
import { LazyLoadingImplementationLaw } from '../../src/checkers/angular-laws/lazy-loading-implementation';
import { ModernAngularControlFlowLaw } from '../../src/checkers/angular-laws/modern-control-flow';
import type { LawResult } from '../../src/types/law.types';
import { FileUtils } from '../../src/utils/file-utils';
import { project, removeProjects } from '../checkers/toolkit-fixture';

const angular = (version: string): Record<string, string> => ({
  'angular.json': JSON.stringify({ version: 1, projects: {} }),
  'package.json': JSON.stringify({
    name: 'angular-app',
    dependencies: { '@angular/core': version, '@angular/router': version },
  }),
  'src/app/app.routes.ts': [
    "import { Routes } from '@angular/router';",
    'export const routes: Routes = [',
    // admin.routes default-exports its Routes (Angular 15+), so no `.then` is needed.
    "  { path: 'admin', loadChildren: () => import('./admin/admin.routes') },",
    '];',
  ].join('\n'),
});

const LIST_TEMPLATE = '<li *ngFor="let item of items">{{ item }}</li>\n';
const DO_CHECK_COMPONENT = [
  "import { Component, DoCheck } from '@angular/core';",
  "@Component({ selector: 'app-list', templateUrl: './list.component.html' })",
  'export class ListComponent implements DoCheck {',
  '  items = [1, 2, 3];',
  '  ngDoCheck(): void { this.items = [...this.items]; }',
  '}',
].join('\n');

const check = async (
  law: { check(context: never): LawResult | Promise<LawResult> },
  files: Record<string, string>
): Promise<string[]> => {
  const result = await law.check({
    projectRoot: project(files),
    config: FileUtils.getMinimalDefaultConfig(),
  } as never);
  return (result.violations ?? []).map(String);
};

describe('#562 Lazy Loading reports lazy loading; the borrowed checks have owners', () => {
  afterEach(removeProjects);

  it('Lazy Loading does not report "No Angular components found" in a project without components', async () => {
    expect(
      await check(LazyLoadingImplementationLaw, angular('17.3.0'))
    ).not.toContain('No Angular components found');
  });

  it('Lazy Loading does not report trackBy or ngDoCheck', async () => {
    const found = await check(LazyLoadingImplementationLaw, {
      ...angular('17.3.0'),
      'src/app/list.component.html': LIST_TEMPLATE,
      'src/app/list.component.ts': DO_CHECK_COMPONENT,
    });
    expect(found.filter(v => /trackBy|ngDoCheck/.test(v))).toEqual([]);
  });

  it('Lazy Loading still reports what it is about: no lazy routes', async () => {
    const found = await check(LazyLoadingImplementationLaw, {
      ...angular('17.3.0'),
      'src/app/app-routing.module.ts': [
        "import { NgModule } from '@angular/core';",
        "import { RouterModule } from '@angular/router';",
        "import { AdminComponent } from './admin.component';",
        '@NgModule({',
        "  imports: [RouterModule.forRoot([{ path: 'admin', component: AdminComponent }])],",
        '})',
        'export class AppRoutingModule {}',
      ].join('\n'),
    });
    expect(found.length).toBeGreaterThan(0);
  });

  describe('Modern Angular Control Flow judges *ngFor without trackBy below Angular 18', () => {
    it('reports it on Angular 17', async () => {
      expect(
        await check(ModernAngularControlFlowLaw, {
          ...angular('17.3.0'),
          'src/app/list.component.html': LIST_TEMPLATE,
        })
      ).toEqual([
        expect.stringContaining(
          '*ngFor without trackBy in src/app/list.component.html'
        ),
      ]);
    });

    it('does not report a list with trackBy, a commented one or a .old. backup', async () => {
      expect(
        await check(ModernAngularControlFlowLaw, {
          ...angular('17.3.0'),
          'src/app/a.component.html':
            '<li *ngFor="let item of items; trackBy: byId">{{ item }}</li>\n',
          'src/app/b.component.html': `<!-- ${LIST_TEMPLATE} -->\n`,
          'src/app/list.component.old.html': LIST_TEMPLATE,
        })
      ).toEqual([]);
    });

    it('on Angular 18+ keeps its syntax rule and adds no trackBy finding', async () => {
      const found = await check(ModernAngularControlFlowLaw, {
        ...angular('18.2.0'),
        'src/app/list.component.html': LIST_TEMPLATE,
      });
      expect(found.some(v => /Legacy \*ngFor/.test(v))).toBe(true);
      expect(found.some(v => /without trackBy/.test(v))).toBe(false);
    });
  });

  describe('Angular Lifecycle Management judges ngDoCheck', () => {
    it('reports a component that implements ngDoCheck', async () => {
      const found = await check(AngularLifecycleManagementLaw, {
        ...angular('17.3.0'),
        'src/app/list.component.ts': DO_CHECK_COMPONENT,
      });
      expect(
        found.some(v => /ngDoCheck found in list\.component/.test(v))
      ).toBe(true);
    });

    it('does not report ngDoCheck named in a comment', async () => {
      const found = await check(AngularLifecycleManagementLaw, {
        ...angular('17.3.0'),
        'src/app/list.component.ts': [
          "import { Component } from '@angular/core';",
          '// no ngDoCheck() here: OnPush with signals instead',
          "@Component({ selector: 'app-list', template: '' })",
          'export class ListComponent {}',
        ].join('\n'),
      });
      // The hook rule reads code. (The older "method without interface"
      // rule of the same law still reads raw text; that is not this rule.)
      expect(found.some(v => /ngDoCheck found/.test(v))).toBe(false);
    });
  });
});

/**
 * #562 (QA): with the borrowed findings gone, a project with no routes and no
 * component came out green, "compliance verified", from nothing (#427). There
 * is no lazy loading to judge there: the law says it judged nothing.
 */
describe('#562 Lazy Loading with no routes and no component judges nothing', () => {
  afterEach(removeProjects);

  const judge = async (files: Record<string, string>): Promise<LawResult> =>
    LazyLoadingImplementationLaw.check({
      projectRoot: project(files),
      config: FileUtils.getMinimalDefaultConfig(),
    } as never);

  it('says it judged nothing for an Angular project with only index.html and styles.css', async () => {
    const result = await judge({
      'angular.json': JSON.stringify({ version: 1, projects: {} }),
      'package.json': JSON.stringify({
        name: 'angular-app',
        dependencies: { '@angular/core': '17.3.0' },
      }),
      'src/index.html':
        '<!doctype html><html><body><app-root></app-root></body></html>\n',
      'src/styles.css': 'body { margin: 0; }\n',
    });
    expect(result.passed).toBe(false);
    expect(result.judgedNothing).toBe(true);
    expect(result.score).toBe(0);
    expect(result.message).toMatch(
      /judged nothing: no route configuration .* and no @Component/
    );
  });

  it('does not take routes named only in a comment for route configuration', async () => {
    const result = await judge({
      ...angular('17.3.0'),
      'src/app/app.routes.ts':
        '// Routes come later: loadChildren for admin\nexport const version = 1;\n',
    });
    expect(result.judgedNothing).toBe(true);
  });

  /** The controls: routes with loadChildren, or a component, are judged as before. */
  it('judges a project with routes and loadChildren', async () => {
    const result = await judge(angular('17.3.0'));
    expect(result.judgedNothing).toBeUndefined();
  });

  it('judges a project with a component and no routes', async () => {
    const result = await judge({
      ...angular('17.3.0'),
      'src/app/app.routes.ts': 'export const version = 1;\n',
      'src/app/hero.component.ts':
        "import { Component } from '@angular/core';\n@Component({ selector: 'app-hero', template: '' })\nexport class HeroComponent {}\n",
    });
    expect(result.judgedNothing).toBeUndefined();
  });
});
