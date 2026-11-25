import { InjectOverConstructorDiLaw } from '../../../src/checkers/angular-laws/inject-over-constructor-di';
import { OnPushChangeDetectionLaw } from '../../../src/checkers/angular-laws/onpush-change-detection';
import { StandaloneComponentsArchitectureLaw } from '../../../src/checkers/angular-laws/standalone-components-architecture';
import { ctx, manifest, project, removeProjects } from '../toolkit-fixture';

afterAll(removeProjects);

/**
 * #43 — three Angular laws said how many ("OnPush usage: 33.3% (1/3
 * components)" with five names, "2/3 components are not standalone",
 * "<file>: 2 constructor(s) using parameter-property DI") and never which
 * component or which constructor. Each law already held what it counted; the
 * details now carry it, relative to the audited project. The violation lines
 * stay as they were.
 */
describe('#43 Angular laws name what they counted', () => {
  const component = (name: string, extra = ''): string =>
    [
      "import { Component } from '@angular/core';",
      '@Component({',
      `  selector: 'app-${name}',`,
      "  template: '<p>x</p>',",
      extra,
      '})',
      `export class ${name}Component {}`,
      '',
    ].join('\n');

  describe('OnPush Change Detection Strategy', () => {
    it('names every component the law says should use OnPush', () => {
      const root = project({
        'package.json': manifest({ '@angular/core': '20.0.0' }),
        'src/app/a.component.ts': component('A'),
        'src/app/b.component.ts': component('B'),
        'src/app/c.component.ts': component(
          'C',
          '  changeDetection: ChangeDetectionStrategy.OnPush,'
        ),
      });

      const result = OnPushChangeDetectionLaw.check(ctx(root));

      expect(result.violations).toContain(
        'OnPush usage: 33.3% (1/3 components)'
      );
      expect(result.violationDetails).toEqual(
        expect.arrayContaining([
          {
            file: 'src/app/a.component.ts',
            message: 'component without ChangeDetectionStrategy.OnPush',
          },
          {
            file: 'src/app/b.component.ts',
            message: 'component without ChangeDetectionStrategy.OnPush',
          },
        ])
      );
      expect(result.violationDetails).toHaveLength(2);
    });

    it('carries no details when every component uses OnPush', () => {
      const root = project({
        'package.json': manifest({ '@angular/core': '20.0.0' }),
        'src/app/c.component.ts': component(
          'C',
          '  changeDetection: ChangeDetectionStrategy.OnPush,'
        ),
      });

      const result = OnPushChangeDetectionLaw.check(ctx(root));

      expect(result.violations).toEqual([]);
      expect(result.violationDetails).toBeUndefined();
    });
  });

  describe('Standalone Components Architecture', () => {
    it('names each component that is not standalone (Angular 19+: standalone: false)', () => {
      const root = project({
        'package.json': manifest({ '@angular/core': '20.0.0' }),
        'src/app/a.component.ts': component('A', '  standalone: false,'),
        'src/app/b.component.ts': component('B', '  standalone: false,'),
        'src/app/c.component.ts': component('C', '  imports: [],'),
      });

      const result = StandaloneComponentsArchitectureLaw.check(ctx(root));

      expect(result.violations).toContain('2/3 components are not standalone');
      expect(result.violationDetails).toEqual(
        expect.arrayContaining([
          {
            file: 'src/app/a.component.ts',
            message: 'component declared standalone: false',
          },
          {
            file: 'src/app/b.component.ts',
            message: 'component declared standalone: false',
          },
        ])
      );
      expect(result.violationDetails).toHaveLength(2);
    });

    it('names each component without the flag before Angular 19', () => {
      const root = project({
        'package.json': manifest({ '@angular/core': '17.3.0' }),
        'src/app/a.component.ts': component('A'),
        'src/app/c.component.ts': component(
          'C',
          '  standalone: true,\n  imports: [],'
        ),
      });

      const result = StandaloneComponentsArchitectureLaw.check(ctx(root));

      expect(result.violations).toContain('1/2 components are not standalone');
      expect(result.violationDetails).toEqual([
        {
          file: 'src/app/a.component.ts',
          message: 'component without standalone: true',
        },
      ]);
    });

    it('carries no details when every component is standalone', () => {
      const root = project({
        'package.json': manifest({ '@angular/core': '20.0.0' }),
        'src/app/c.component.ts': component('C', '  imports: [],'),
      });

      const result = StandaloneComponentsArchitectureLaw.check(ctx(root));

      expect(result.violationDetails).toBeUndefined();
    });
  });

  describe('Inject Over Constructor DI', () => {
    it('names each injected constructor at its line', () => {
      const root = project({
        'package.json': manifest({ '@angular/core': '20.0.0' }),
        'src/app/data.service.ts': [
          "import { Injectable } from '@angular/core';",
          '@Injectable()',
          'export class DataService {',
          '  constructor(private readonly http: Http) {}',
          '}',
          '@Injectable()',
          'export class OtherService {',
          '',
          '  constructor(public store: Store) {}',
          '}',
          'export class Fake {',
          '  constructor(readonly seed = {}) {}',
          '}',
          '',
        ].join('\n'),
      });

      const result = InjectOverConstructorDiLaw.check(ctx(root));

      expect(result.violations).toEqual([
        'src/app/data.service.ts: 2 constructor(s) using parameter-property DI — inject() in a field initializer instead.',
      ]);
      expect(result.violationDetails).toEqual([
        {
          file: 'src/app/data.service.ts',
          line: 4,
          message: 'constructor with parameter-property DI',
        },
        {
          file: 'src/app/data.service.ts',
          line: 9,
          message: 'constructor with parameter-property DI',
        },
      ]);
    });

    it('carries no details when no constructor injects', () => {
      const root = project({
        'package.json': manifest({ '@angular/core': '20.0.0' }),
        'src/app/data.service.ts':
          "import { Injectable, inject } from '@angular/core';\n@Injectable()\nexport class DataService {\n  private readonly http = inject(Http);\n}\n",
      });

      const result = InjectOverConstructorDiLaw.check(ctx(root));

      expect(result.violations).toEqual([]);
      expect(result.violationDetails).toBeUndefined();
    });
  });
});
