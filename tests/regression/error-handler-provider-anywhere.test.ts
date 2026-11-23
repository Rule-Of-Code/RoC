import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as ts from 'typescript';

import { registersGlobalHandler } from '../../src/checkers/code-quality-laws/global-error-handlers';
import { PerformanceMonitoringPolicyLaw } from '../../src/laws/performance/performance-monitoring-policy';
import { FileUtils } from '../../src/utils';
import * as tsxSource from '../../src/utils/react/tsx-source';

/**
 * #553, the ErrorHandler part. Performance Monitoring Policy accepted an own
 * Angular ErrorHandler as error tracking only when the text `ErrorHandler`
 * stood in src/app/app.module.ts or src/app/app.component.ts. A standalone
 * app registers it in app.config.ts (or in bootstrapApplication's
 * providers) and has no app.module.ts, so it was told error tracking is
 * "not configured". The law now asks the detector Global Error Handlers
 * uses, over the production sources.
 */
describe('an ErrorHandler provider is recognised wherever it is registered', () => {
  const parse = (code: string): ts.SourceFile =>
    ts.createSourceFile('x.ts', code, ts.ScriptTarget.Latest, true);

  describe('the shared detector (registersGlobalHandler)', () => {
    it.each([
      [
        '{ provide: ErrorHandler, useClass }',
        "import { ApplicationConfig, ErrorHandler } from '@angular/core';\nexport const appConfig: ApplicationConfig = {\n  providers: [{ provide: ErrorHandler, useClass: AppErrorHandler }],\n};\n",
      ],
      [
        '{ provide: ErrorHandler, useValue } in bootstrapApplication',
        'bootstrapApplication(App, {\n  providers: [{ provide: ErrorHandler, useValue: Tracker.createErrorHandler() }],\n});\n',
      ],
      [
        '{ provide: ErrorHandler, useFactory }',
        'export const providers = [{ provide: ErrorHandler, useFactory: () => new AppErrorHandler() }];\n',
      ],
      [
        'provideBrowserGlobalErrorListeners()',
        'export const appConfig = { providers: [provideBrowserGlobalErrorListeners()] };\n',
      ],
      [
        'a provide…ErrorHandler() helper',
        'export const appConfig = { providers: [provideAppErrorHandler()] };\n',
      ],
    ])('%s', (_label, code) => {
      expect(registersGlobalHandler(ts, parse(code))).toBe(true);
    });

    it('a file that handles no error globally', () => {
      expect(
        registersGlobalHandler(
          ts,
          parse('export function log(e: unknown): void { console.error(e); }\n')
        )
      ).toBe(false);
    });
  });

  describe('Performance Monitoring Policy', () => {
    const roots: string[] = [];
    afterAll(() =>
      roots.forEach(r => fs.rmSync(r, { recursive: true, force: true }))
    );
    afterEach(() => jest.restoreAllMocks());

    const NG: Record<string, string> = {
      'package.json': JSON.stringify({
        name: 'web',
        version: '1.0.0',
        dependencies: { '@angular/core': '^20.0.0' },
      }),
      'src/main.ts':
        "import { bootstrapApplication } from '@angular/platform-browser';\nimport { AppComponent } from './app/app.component';\nimport { appConfig } from './app/app.config';\n\nbootstrapApplication(AppComponent, appConfig);\n",
      'src/app/app.component.ts':
        "import { Component } from '@angular/core';\n\n@Component({ selector: 'app-root', standalone: true, template: '' })\nexport class AppComponent {}\n",
    };

    const project = (files: Record<string, string>): string => {
      const root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-553b-'));
      roots.push(root);
      for (const [rel, text] of Object.entries({ ...NG, ...files })) {
        fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
        fs.writeFileSync(path.join(root, rel), text);
      }
      return root;
    };

    const violations = async (root: string): Promise<string[]> =>
      (
        await PerformanceMonitoringPolicyLaw.check({
          projectRoot: root,
          config: FileUtils.getMinimalDefaultConfig(),
        })
      ).violations ?? [];

    const NOT_CONFIGURED = 'Performance error tracking not configured';

    it('an ErrorHandler provided in app.config.ts counts', async () => {
      const root = project({
        'src/app/app.config.ts':
          "import { ApplicationConfig, ErrorHandler } from '@angular/core';\nimport { AppErrorHandler } from './app-error-handler';\n\nexport const appConfig: ApplicationConfig = {\n  providers: [{ provide: ErrorHandler, useClass: AppErrorHandler }],\n};\n",
      });

      expect(await violations(root)).not.toContain(NOT_CONFIGURED);
    });

    it('an ErrorHandler provided through a helper in another module counts', async () => {
      const root = project({
        'src/app/app.config.ts':
          "import { provideAppErrorHandler } from './core/errors';\n\nexport const appConfig = { providers: [provideAppErrorHandler()] };\n",
        'src/app/core/errors.ts':
          "import { ErrorHandler, Provider } from '@angular/core';\n\nexport function provideAppErrorHandler(): Provider {\n  return { provide: ErrorHandler, useClass: AppErrorHandler };\n}\n",
      });

      expect(await violations(root)).not.toContain(NOT_CONFIGURED);
    });

    it('an import of ErrorHandler, or provideHttpClient(), captures nothing', async () => {
      const root = project({
        'src/app/app.config.ts':
          "import { ErrorHandler } from '@angular/core';\nimport { provideHttpClient } from '@angular/common/http';\n\nexport type Handler = ErrorHandler;\nexport const appConfig = { providers: [provideHttpClient()] };\n",
      });

      expect(await violations(root)).toContain(NOT_CONFIGURED);
    });

    it('a handler in a test file does not count', async () => {
      const root = project({
        'src/app/app.config.spec.ts':
          'export const providers = [{ provide: ErrorHandler, useClass: FakeHandler }];\n',
      });

      expect(await violations(root)).toContain(NOT_CONFIGURED);
    });

    it('without the parser the sources are said to be not read', async () => {
      jest.spyOn(tsxSource, 'loadTypeScript').mockReturnValue(null);
      const root = project({
        'src/app/app.config.ts':
          'export const appConfig = { providers: [{ provide: ErrorHandler, useClass: AppErrorHandler }] };\n',
      });

      const found = await violations(root);
      expect(found.some(v => /NOT read/.test(v))).toBe(true);
    });
  });
});
