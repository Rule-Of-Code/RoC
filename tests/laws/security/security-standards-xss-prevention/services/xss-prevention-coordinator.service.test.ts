/**
 * @fileoverview Tests for XSSPreventionAnalyzerService
 * @description Tests for the XSS Prevention Coordinator Service
 */

import { XSSPreventionAnalyzerService } from '../../../../../src/laws/security/security-standards-xss-prevention/services/xss-prevention-coordinator.service';
import { ConfigFileUtils } from '../../../../../src/utils/config-file-utils';
import { FileUtils } from '../../../../../src/utils/file-utils';
import { PathOperations } from '../../../../../src/utils/path-operations';

describe('laws/security/security-standards-xss-prevention/services/xss-prevention-coordinator.service', () => {
  let tempDir: string;
  let defaultConfig: ReturnType<typeof ConfigFileUtils.getMinimalDefaultConfig>;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('xss-prevention-coordinator-test-');
    defaultConfig = ConfigFileUtils.getMinimalDefaultConfig();
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
  });

  describe('XSSPreventionAnalyzerService.analyze', () => {
    it('should return an array of violations', () => {
      const violations = XSSPreventionAnalyzerService.analyze(
        tempDir,
        defaultConfig
      );

      expect(Array.isArray(violations)).toBe(true);
    });

    it('should return violations for empty project', () => {
      const violations = XSSPreventionAnalyzerService.analyze(
        tempDir,
        defaultConfig
      );

      expect(violations.length).toBeGreaterThan(0);
    });

    it('should aggregate violations from all analyzers', () => {
      const violations = XSSPreventionAnalyzerService.analyze(
        tempDir,
        defaultConfig
      );

      // Should have CSP, DomSanitizer, and security headers violations
      expect(violations.length).toBeGreaterThan(1);
    });

    it('should handle non-existent project root', () => {
      const nonExistentPath = PathOperations.join(tempDir, 'non-existent');

      const violations = XSSPreventionAnalyzerService.analyze(
        nonExistentPath,
        defaultConfig
      );

      expect(Array.isArray(violations)).toBe(true);
    });

    it('should handle empty config', () => {
      const emptyConfig = {} as ReturnType<
        typeof ConfigFileUtils.getMinimalDefaultConfig
      >;

      const violations = XSSPreventionAnalyzerService.analyze(
        tempDir,
        emptyConfig
      );

      expect(Array.isArray(violations)).toBe(true);
    });
  });

  describe('CSP Configuration Analyzer coordination', () => {
    it('should detect missing CSP configuration', () => {
      const violations = XSSPreventionAnalyzerService.analyze(
        tempDir,
        defaultConfig
      );

      const hasCspViolation = violations.some(
        v => v.includes('CSP') || v.includes('Content Security Policy')
      );
      expect(hasCspViolation).toBe(true);
    });

    it('should pass when CSP is configured in angular.json', () => {
      const angularConfig = JSON.stringify({
        projects: {
          app: {
            architect: {
              build: {
                options: {
                  headers: {
                    'Content-Security-Policy': "default-src 'self'",
                  },
                },
              },
            },
          },
        },
      });
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'angular.json'),
        angularConfig
      );

      const violations = XSSPreventionAnalyzerService.analyze(
        tempDir,
        defaultConfig
      );

      const hasNoCspViolation = violations.some(
        v => v === 'No Content Security Policy configuration found'
      );
      expect(hasNoCspViolation).toBe(false);
    });

    it('should analyze webpack config with CSP headers', () => {
      const webpackConfig = `
        module.exports = {
          devServer: {
            headers: {
              'Content-Security-Policy': "default-src 'self' 'unsafe-inline'"
            }
          }
        };
      `;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'webpack.config.js'),
        webpackConfig
      );

      const violations = XSSPreventionAnalyzerService.analyze(
        tempDir,
        defaultConfig
      );

      // Should analyze without error and return violations array
      expect(Array.isArray(violations)).toBe(true);
    });

    it('should analyze firebase.json with CSP headers', () => {
      const configContent = `
        {
          "headers": {
            "Content-Security-Policy": "default-src 'self'"
          }
        }
      `;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'firebase.json'),
        configContent
      );

      const violations = XSSPreventionAnalyzerService.analyze(
        tempDir,
        defaultConfig
      );

      // Should analyze and return violations array
      expect(Array.isArray(violations)).toBe(true);
    });
  });

  describe('Dangerous Patterns Analyzer coordination', () => {
    it('should detect innerHTML usage', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);

      const componentContent = `
        export class TestComponent {
          setContent(content: string) {
            this.element.innerHTML = content;
          }
        }
      `;
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'test.component.ts'),
        componentContent
      );

      const violations = XSSPreventionAnalyzerService.analyze(
        tempDir,
        defaultConfig
      );

      const hasInnerHtmlViolation = violations.some((v: string) =>
        v.includes('innerHTML')
      );
      expect(hasInnerHtmlViolation).toBe(true);
    });

    it('should detect bypassSecurityTrustHtml usage', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);

      const componentContent = `
        import { DomSanitizer } from '@angular/platform-browser';

        export class TestComponent {
          constructor(private sanitizer: DomSanitizer) {}

          getUnsafeHtml(html: string) {
            return this.sanitizer.bypassSecurityTrustHtml(html);
          }
        }
      `;
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'bypass.component.ts'),
        componentContent
      );

      const violations = XSSPreventionAnalyzerService.analyze(
        tempDir,
        defaultConfig
      );

      const hasBypassViolation = violations.some((v: string) =>
        v.includes('bypassSecurityTrust')
      );
      expect(hasBypassViolation).toBe(true);
    });

    it('should detect eval() usage', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);

      const utilContent = `
        export function executeCode(code: string) {
          return eval(code);
        }
      `;
      FileUtils.writeFile(PathOperations.join(srcDir, 'utils.ts'), utilContent);

      const violations = XSSPreventionAnalyzerService.analyze(
        tempDir,
        defaultConfig
      );

      const hasEvalViolation = violations.some((v: string) =>
        v.includes('eval')
      );
      expect(hasEvalViolation).toBe(true);
    });

    it('should detect document.write() usage', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);

      const legacyContent = `
        export function writePage(html: string) {
          document.write(html);
        }
      `;
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'legacy.ts'),
        legacyContent
      );

      const violations = XSSPreventionAnalyzerService.analyze(
        tempDir,
        defaultConfig
      );

      const hasDocWriteViolation = violations.some((v: string) =>
        v.includes('document.write')
      );
      expect(hasDocWriteViolation).toBe(true);
    });

    it('should analyze Function constructor usage', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);

      const utilContent = `
        export function createFunction(code: string) {
          return new Function(code);
        }
      `;
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'dynamic.ts'),
        utilContent
      );

      const violations = XSSPreventionAnalyzerService.analyze(
        tempDir,
        defaultConfig
      );

      // Should analyze and return violations array
      expect(Array.isArray(violations)).toBe(true);
    });
  });

  describe('Input Sanitization Analyzer coordination', () => {
    it('should detect missing DomSanitizer implementation', () => {
      const violations = XSSPreventionAnalyzerService.analyze(
        tempDir,
        defaultConfig
      );

      const hasSanitizerViolation = violations.some((v: string) =>
        v.includes('DomSanitizer')
      );
      expect(hasSanitizerViolation).toBe(true);
    });

    it('should pass when DomSanitizer is used with sanitize call', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);

      const componentContent = `
        import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

        export class SafeComponent {
          constructor(private sanitizer: DomSanitizer) {}

          getSafeHtml(html: string): SafeHtml {
            return this.sanitizer.sanitize(SecurityContext.HTML, html);
          }
        }
      `;
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'safe.component.ts'),
        componentContent
      );

      const violations = XSSPreventionAnalyzerService.analyze(
        tempDir,
        defaultConfig
      );

      const hasNoSanitizerViolation = violations.some(
        v =>
          v ===
          'No DomSanitizer implementation found - required for safe HTML handling'
      );
      expect(hasNoSanitizerViolation).toBe(false);
    });

    it('should detect DomSanitizer without sanitize calls', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);

      const componentContent = `
        import { DomSanitizer } from '@angular/platform-browser';

        export class PartialComponent {
          constructor(private sanitizer: DomSanitizer) {}

          // DomSanitizer imported but not used for sanitization
        }
      `;
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'partial.component.ts'),
        componentContent
      );

      const violations = XSSPreventionAnalyzerService.analyze(
        tempDir,
        defaultConfig
      );

      const hasNoCallsViolation = violations.some((v: string) =>
        v.includes('no sanitization calls')
      );
      expect(hasNoCallsViolation).toBe(true);
    });

    it('should detect unsanitized user input handling', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);

      const componentContent = `
        export class FormComponent {
          handleInput(event: Event) {
            const userInput = (event.target as HTMLInputElement).value;
            document.body.innerHTML = userInput;
          }
        }
      `;
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'form.component.ts'),
        componentContent
      );

      const violations = XSSPreventionAnalyzerService.analyze(
        tempDir,
        defaultConfig
      );

      const hasUnsanitizedViolation = violations.some(
        v => v.includes('unsanitized') || v.includes('innerHTML')
      );
      expect(hasUnsanitizedViolation).toBe(true);
    });
  });

  describe('Security Headers Analyzer coordination', () => {
    it('should detect missing security headers', () => {
      const violations = XSSPreventionAnalyzerService.analyze(
        tempDir,
        defaultConfig
      );

      const hasSecurityHeadersViolation = violations.some((v: string) =>
        v.includes('security headers')
      );
      expect(hasSecurityHeadersViolation).toBe(true);
    });

    it('should pass when helmet is configured', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);

      const serverContent = `
        import express from 'express';
        import helmet from 'helmet';

        const app = express();
        app.use(helmet());
        app.listen(3000);
      `;
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'server.ts'),
        serverContent
      );

      const violations = XSSPreventionAnalyzerService.analyze(
        tempDir,
        defaultConfig
      );

      const hasNoHelmetViolation = violations.some(
        v =>
          v ===
          'No security headers implementation found (helmet, custom headers, etc.)'
      );
      expect(hasNoHelmetViolation).toBe(false);
    });

    it('should analyze firebase.json with security headers', () => {
      const firebaseConfig = JSON.stringify({
        hosting: {
          headers: [
            {
              source: '**',
              headers: [
                {
                  key: 'X-Frame-Options',
                  value: 'DENY',
                },
              ],
            },
          ],
        },
      });
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'firebase.json'),
        firebaseConfig
      );

      const violations = XSSPreventionAnalyzerService.analyze(
        tempDir,
        defaultConfig
      );

      // Should analyze and return violations array
      expect(Array.isArray(violations)).toBe(true);
    });
  });

  describe('Template Safety Analyzer coordination', () => {
    it('should analyze templates with innerHTML binding', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);

      const templateContent = `
        <div [innerHTML]="dangerousHtml"></div>
      `;
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'app.component.html'),
        templateContent
      );

      const violations = XSSPreventionAnalyzerService.analyze(
        tempDir,
        defaultConfig
      );

      // Should analyze and return violations array
      expect(Array.isArray(violations)).toBe(true);
    });

    it('should analyze templates with inline script tags', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);

      const templateContent = `
        <div>
          <script>console.log('inline script')</script>
        </div>
      `;
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'index.html'),
        templateContent
      );

      const violations = XSSPreventionAnalyzerService.analyze(
        tempDir,
        defaultConfig
      );

      // Should analyze and return violations array
      expect(Array.isArray(violations)).toBe(true);
    });

    it('should analyze templates with javascript: protocol', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);

      const templateContent = `
        <a href="javascript:alert('XSS')">Click</a>
      `;
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'link.component.html'),
        templateContent
      );

      const violations = XSSPreventionAnalyzerService.analyze(
        tempDir,
        defaultConfig
      );

      // Should analyze and return violations array
      expect(Array.isArray(violations)).toBe(true);
    });

    it('should analyze templates with inline event handlers', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);

      const templateContent = `
        <button onclick="handleClick()">Click me</button>
        <input onchange="handleChange()">
      `;
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'events.html'),
        templateContent
      );

      const violations = XSSPreventionAnalyzerService.analyze(
        tempDir,
        defaultConfig
      );

      // Should analyze and return violations array
      expect(Array.isArray(violations)).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle malformed JSON files', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'angular.json'),
        '{ invalid'
      );

      const violations = XSSPreventionAnalyzerService.analyze(
        tempDir,
        defaultConfig
      );

      expect(Array.isArray(violations)).toBe(true);
    });

    it('should handle empty files', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);

      FileUtils.writeFile(
        PathOperations.join(srcDir, 'empty.component.ts'),
        ''
      );

      const violations = XSSPreventionAnalyzerService.analyze(
        tempDir,
        defaultConfig
      );

      expect(Array.isArray(violations)).toBe(true);
    });

    it('should handle files with only whitespace', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);

      FileUtils.writeFile(
        PathOperations.join(srcDir, 'whitespace.ts'),
        '   \n\n   '
      );

      const violations = XSSPreventionAnalyzerService.analyze(
        tempDir,
        defaultConfig
      );

      expect(Array.isArray(violations)).toBe(true);
    });

    it('should handle deeply nested directories', () => {
      const deepDir = PathOperations.join(
        tempDir,
        'src',
        'app',
        'features',
        'security',
        'xss',
        'components'
      );
      FileUtils.createDirectory(deepDir);

      FileUtils.writeFile(
        PathOperations.join(deepDir, 'deep.component.ts'),
        'export class DeepComponent {}'
      );

      const violations = XSSPreventionAnalyzerService.analyze(
        tempDir,
        defaultConfig
      );

      expect(Array.isArray(violations)).toBe(true);
    });

    it('should handle multiple file types', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);

      FileUtils.writeFile(
        PathOperations.join(srcDir, 'app.component.ts'),
        'export class AppComponent {}'
      );
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'app.component.html'),
        '<div>App</div>'
      );
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'styles.scss'),
        '.app { color: red; }'
      );
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'main.js'),
        'console.log("main");'
      );

      const violations = XSSPreventionAnalyzerService.analyze(
        tempDir,
        defaultConfig
      );

      expect(Array.isArray(violations)).toBe(true);
    });

    it('should handle project with many files', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);

      for (let i = 0; i < 10; i++) {
        FileUtils.writeFile(
          PathOperations.join(srcDir, `component${i}.ts`),
          `export class Component${i} {}`
        );
        FileUtils.writeFile(
          PathOperations.join(srcDir, `component${i}.html`),
          `<div>Component ${i}</div>`
        );
      }

      const violations = XSSPreventionAnalyzerService.analyze(
        tempDir,
        defaultConfig
      );

      expect(Array.isArray(violations)).toBe(true);
    });
  });
});
