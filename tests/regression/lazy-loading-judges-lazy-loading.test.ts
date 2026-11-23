/**
 * #562 — Lazy Loading Implementation called three analyzers of Change
 * Detection Optimization (components, trackBy, observables) and appended
 * their findings to its own. With no component files the line "No Angular
 * components found" appeared twice and cost 20 points, and a project saw
 * change-detection findings under two laws. Lazy Loading judges lazy loading.
 */
import { LazyLoadingImplementationLaw } from '../../src/checkers/angular-laws/lazy-loading-implementation';
import { ChangeDetectionOptimizationLaw } from '../../src/checkers/performance-laws/change-detection-optimization';
import { FileUtils } from '../../src/utils/file-utils';
import { project, removeProjects } from '../checkers/toolkit-fixture';

const ANGULAR = {
  'angular.json': JSON.stringify({ version: 1, projects: {} }),
  'package.json': JSON.stringify({
    name: 'angular-app',
    dependencies: { '@angular/core': '18.0.0', '@angular/router': '18.0.0' },
  }),
  'src/app/app.routes.ts': [
    "import { Routes } from '@angular/router';",
    'export const routes: Routes = [',
    "  { path: 'admin', loadChildren: () => import('./admin/admin.routes').then(m => m.ADMIN_ROUTES) },",
    '];',
  ].join('\n'),
};

const violations = (files: Record<string, string>): string[] =>
  LazyLoadingImplementationLaw.check({
    projectRoot: project({ ...ANGULAR, ...files }),
    config: FileUtils.getMinimalDefaultConfig(),
  }).violations ?? [];

describe('#562 Lazy Loading reports lazy loading, not change detection', () => {
  afterEach(removeProjects);

  it('does not report "No Angular components found" in a project without components', () => {
    expect(violations({})).not.toContain('No Angular components found');
  });

  it("does not repeat Change Detection Optimization's findings", () => {
    // Whatever that law finds is reported by that law, once.
    const finding = {
      violations: ['a change-detection finding'],
      suggestions: [],
    };
    const spies = [
      jest
        .spyOn(ChangeDetectionOptimizationLaw, 'analyzeComponents')
        .mockReturnValue(finding),
      jest
        .spyOn(ChangeDetectionOptimizationLaw, 'analyzeTrackByUsage')
        .mockReturnValue(finding),
      jest
        .spyOn(ChangeDetectionOptimizationLaw, 'analyzeObservableUsage')
        .mockReturnValue(finding),
    ];
    try {
      expect(violations({})).not.toContain('a change-detection finding');
    } finally {
      spies.forEach(spy => spy.mockRestore());
    }
  });

  it('still reports what it is about: no lazy routes', () => {
    const found = LazyLoadingImplementationLaw.check({
      projectRoot: project({
        ...ANGULAR,
        'src/app/app-routing.module.ts': [
          "import { NgModule } from '@angular/core';",
          "import { RouterModule } from '@angular/router';",
          "import { AdminComponent } from './admin.component';",
          '@NgModule({',
          "  imports: [RouterModule.forRoot([{ path: 'admin', component: AdminComponent }])],",
          '})',
          'export class AppRoutingModule {}',
        ].join('\n'),
      }),
      config: FileUtils.getMinimalDefaultConfig(),
    });
    expect(found.violations?.length ?? 0).toBeGreaterThan(0);
  });
});
