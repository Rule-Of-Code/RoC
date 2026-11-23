import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { PerformanceMonitoringPolicyLaw } from '../../src/laws/performance/performance-monitoring-policy';
import { PerformanceMonitoringStandardsLaw } from '../../src/laws/performance/performance-monitoring-standards';
import { PerformanceStandardsLaw } from '../../src/laws/performance/performance-standards';
import { FileUtils } from '../../src/utils';
import { BrowserMonitoringEvidence } from '../../src/utils/performance/browser-monitoring-evidence';

/**
 * #553. Three laws recognise browser monitoring through their own copies of
 * a list of third-party names (web-vitals v3 `getLCP`…, SDK packages), read
 * in a few fixed files. A standalone Angular app that measures LCP, CLS and
 * INP itself with PerformanceObserver and registers its own ErrorHandler in
 * app.config.ts was told monitoring is "not implemented" (the ErrorHandler
 * part is covered by error-handler-provider-anywhere.test.ts); a project that
 * declares web-vitals and never calls it passed the Core Web Vitals check.
 */
describe('browser monitoring is recognised by what the code does, not by a vendor name', () => {
  const roots: string[] = [];
  afterAll(() =>
    roots.forEach(r => fs.rmSync(r, { recursive: true, force: true }))
  );

  const NG_PACKAGE = {
    name: 'web',
    version: '1.0.0',
    dependencies: {
      '@angular/core': '^20.0.0',
      '@angular/platform-browser': '^20.0.0',
    } as Record<string, string>,
  };

  const STANDALONE_APP: Record<string, string> = {
    'src/main.ts':
      "import { bootstrapApplication } from '@angular/platform-browser';\nimport { AppComponent } from './app/app.component';\nimport { appConfig } from './app/app.config';\nimport { startVitals } from './app/vitals';\n\nstartVitals();\nbootstrapApplication(AppComponent, appConfig);\n",
    'src/app/app.component.ts':
      "import { Component } from '@angular/core';\n\n@Component({ selector: 'app-root', standalone: true, template: '<h1>x</h1>' })\nexport class AppComponent {}\n",
    'src/app/app.config.ts':
      "import { ApplicationConfig, ErrorHandler } from '@angular/core';\nimport { AppErrorHandler } from './app-error-handler';\n\nexport const appConfig: ApplicationConfig = {\n  providers: [{ provide: ErrorHandler, useClass: AppErrorHandler }],\n};\n",
    'src/app/app-error-handler.ts':
      "import { ErrorHandler, Injectable } from '@angular/core';\n\n@Injectable()\nexport class AppErrorHandler implements ErrorHandler {\n  handleError(error: unknown): void {\n    navigator.sendBeacon('/api/client-errors', JSON.stringify({ message: String(error) }));\n  }\n}\n",
  };

  const OBSERVER_VITALS =
    "export function startVitals(): void {\n  const report = (name: string, value: number): void => {\n    navigator.sendBeacon('/api/vitals', JSON.stringify({ name, value }));\n  };\n  new PerformanceObserver(list => {\n    for (const e of list.getEntries()) report('LCP', e.startTime);\n  }).observe({ type: 'largest-contentful-paint', buffered: true });\n  new PerformanceObserver(list => {\n    for (const e of list.getEntries()) report('CLS', (e as unknown as { value: number }).value);\n  }).observe({ type: 'layout-shift', buffered: true });\n  new PerformanceObserver(list => {\n    for (const e of list.getEntries()) report('INP', e.duration);\n  }).observe({ type: 'event', buffered: true });\n}\n";

  const project = (
    vitals: string,
    extraDeps: Record<string, string> = {}
  ): string => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-553-'));
    roots.push(root);
    const files: Record<string, string> = {
      ...STANDALONE_APP,
      'src/app/vitals.ts': vitals,
      'package.json': JSON.stringify({
        ...NG_PACKAGE,
        dependencies: { ...NG_PACKAGE.dependencies, ...extraDeps },
      }),
    };
    for (const [rel, text] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
      fs.writeFileSync(path.join(root, rel), text);
    }
    return root;
  };

  const violationsOf = async (
    law: { check: (c: never) => Promise<{ violations?: string[] }> },
    root: string
  ): Promise<string[]> => {
    const result = await law.check({
      projectRoot: root,
      config: FileUtils.getMinimalDefaultConfig(),
    } as never);
    return result.violations ?? [];
  };

  describe('own PerformanceObserver measurement and own ErrorHandler, no vendor SDK', () => {
    it('Performance Standards: Core Web Vitals are monitored', async () => {
      const found = await violationsOf(
        PerformanceStandardsLaw,
        project(OBSERVER_VITALS)
      );
      expect(found.filter(v => /Core Web Vitals/.test(v))).toEqual([]);
    });

    it('Performance Monitoring Policy: Core Web Vitals and field metrics are recognised', async () => {
      const found = await violationsOf(
        PerformanceMonitoringPolicyLaw,
        project(OBSERVER_VITALS)
      );
      expect(found).not.toContain('Core Web Vitals monitoring not implemented');
      expect(found).not.toContain('Real User Monitoring not configured');
    });

    it('Performance Monitoring Standards: field metrics are recognised outside main.ts', async () => {
      const found = await violationsOf(
        PerformanceMonitoringStandardsLaw,
        project(OBSERVER_VITALS)
      );
      expect(found).not.toContain('Real User Monitoring not configured');
    });
  });

  describe('web-vitals v4', () => {
    const V4_VITALS =
      "import { onCLS, onINP, onLCP } from 'web-vitals';\n\nexport function startVitals(): void {\n  const report = (m: { name: string; value: number }): void => {\n    navigator.sendBeacon('/api/vitals', JSON.stringify(m));\n  };\n  onCLS(report);\n  onINP(report);\n  onLCP(report);\n}\n";

    it('on* calls are recognised by all three laws', async () => {
      const root = project(V4_VITALS, { 'web-vitals': '^4.2.0' });
      expect(
        (await violationsOf(PerformanceStandardsLaw, root)).filter(v =>
          /Core Web Vitals/.test(v)
        )
      ).toEqual([]);
      expect(
        await violationsOf(PerformanceMonitoringPolicyLaw, root)
      ).not.toContain('Core Web Vitals monitoring not implemented');
      expect(
        await violationsOf(PerformanceMonitoringStandardsLaw, root)
      ).not.toContain('Real User Monitoring not configured');
    });

    it('a declared web-vitals that is never called is not monitoring', async () => {
      const root = project('export function startVitals(): void {}\n', {
        'web-vitals': '^4.2.0',
      });
      expect(
        await violationsOf(PerformanceMonitoringPolicyLaw, root)
      ).toContain('Core Web Vitals monitoring not implemented');
    });
  });

  describe('what is not a measurement', () => {
    const measured = (vitals: string, extra: Record<string, string> = {}) => {
      const root = project(vitals);
      for (const [rel, text] of Object.entries(extra)) {
        fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
        fs.writeFileSync(path.join(root, rel), text);
      }
      return BrowserMonitoringEvidence.vitalsMeasurements(root);
    };

    it('a name in a comment', () => {
      expect(
        measured(
          "// import { onLCP } from 'web-vitals'; onLCP(report);\n/* new PerformanceObserver(cb).observe({ type: 'layout-shift' }) */\nexport function startVitals(): void {}\n"
        )
      ).toEqual([]);
    });

    it('a PerformanceObserver on resource timing only', () => {
      expect(
        measured(
          "export function startVitals(): void {\n  new PerformanceObserver(list => list.getEntries()).observe({ type: 'resource' });\n}\n"
        )
      ).toEqual([]);
    });

    it('a measurement in a test file only', () => {
      expect(
        measured('export function startVitals(): void {}\n', {
          'src/app/vitals.spec.ts': OBSERVER_VITALS,
        })
      ).toEqual([]);
    });

    it('names where the measurement is', () => {
      expect(measured(OBSERVER_VITALS)).toEqual([
        { kind: 'performance-observer', at: 'src/app/vitals.ts' },
      ]);
    });

    it('Performance Standards says a declared web-vitals is not called', async () => {
      const root = project('export function startVitals(): void {}\n', {
        'web-vitals': '^4.2.0',
      });
      expect(
        (await violationsOf(PerformanceStandardsLaw, root)).filter(v =>
          /web-vitals is declared but no metric is measured/.test(v)
        )
      ).toHaveLength(1);
    });
  });
});
