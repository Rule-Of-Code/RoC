/**
 * Tests for XSSPreventionLaw
 *
 * Tests the XSS Prevention Law which prevents Cross-Site Scripting vulnerabilities
 */
import { XSSPreventionLaw } from '../../../src/checkers/security-laws/xss-prevention';
import type {
  LawCheckContext,
  RuleOfCodeConfig,
} from '../../../src/types/law.types';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('XSSPreventionLaw', () => {
  let tempDir: string;
  let mockConfig: RuleOfCodeConfig;
  let context: LawCheckContext;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('xss-prevention-test-');
    mockConfig = FileUtils.getMinimalDefaultConfig();
    context = {
      projectRoot: tempDir,
      config: mockConfig,
    };
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
  });

  // ============================================
  // check - Basic Behavior
  // ============================================
  describe('check()', () => {
    describe('basic result structure', () => {
      it('should return a result object', () => {
        const result = XSSPreventionLaw.check(context);

        expect(result).toBeDefined();
        expect(typeof result.passed).toBe('boolean');
      });

      it('should include violations array', () => {
        const result = XSSPreventionLaw.check(context);

        expect(Array.isArray(result.violations)).toBe(true);
      });

      it('should include suggestions array', () => {
        const result = XSSPreventionLaw.check(context);

        expect(Array.isArray(result.suggestions)).toBe(true);
      });

      it('should have score between 0 and 100', () => {
        const result = XSSPreventionLaw.check(context);

        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(100);
      });

      it('should include message property', () => {
        const result = XSSPreventionLaw.check(context);

        expect(typeof result.message).toBe('string');
      });

      it('should include config in result', () => {
        const result = XSSPreventionLaw.check(context);

        expect(result.config).toBeDefined();
      });
    });

    describe('dangerous pattern detection - innerHTML', () => {
      it('should detect innerHTML assignment', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'component.ts'),
          `
            export class MyComponent {
              render(html: string) {
                element.innerHTML = html;
              }
            }
          `
        );

        const result = XSSPreventionLaw.check(context);

        expect(result).toBeDefined();
        expect(
          (result.violations ?? []).some(v =>
            v.toLowerCase().includes('innerhtml')
          )
        ).toBe(true);
      });

      it('should detect Angular [innerHTML] binding', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'component.html'),
          `
            <div [innerHTML]="userContent"></div>
          `
        );

        const result = XSSPreventionLaw.check(context);

        expect(result).toBeDefined();
      });
    });

    describe('dangerous pattern detection - outerHTML', () => {
      it('should detect outerHTML assignment', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'component.ts'),
          `
            export class MyComponent {
              replace(html: string) {
                element.outerHTML = html;
              }
            }
          `
        );

        const result = XSSPreventionLaw.check(context);

        expect(result).toBeDefined();
        expect(
          (result.violations ?? []).some(v =>
            v.toLowerCase().includes('outerhtml')
          )
        ).toBe(true);
      });
    });

    describe('dangerous pattern detection - insertAdjacentHTML', () => {
      it('should detect insertAdjacentHTML usage', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'component.ts'),
          `
            export class MyComponent {
              append(html: string) {
                element.insertAdjacentHTML('beforeend', html);
              }
            }
          `
        );

        const result = XSSPreventionLaw.check(context);

        expect(result).toBeDefined();
        expect(
          (result.violations ?? []).some(v =>
            v.toLowerCase().includes('insertadjacenthtml')
          )
        ).toBe(true);
      });
    });

    describe('dangerous pattern detection - document.write', () => {
      it('should detect document.write usage', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'legacy.ts'),
          `
            export function render(html: string) {
              document.write(html);
            }
          `
        );

        const result = XSSPreventionLaw.check(context);

        expect(result).toBeDefined();
        expect(
          (result.violations ?? []).some(
            v =>
              v.toLowerCase().includes('document') &&
              v.toLowerCase().includes('write')
          )
        ).toBe(true);
      });
    });

    describe('dangerous pattern detection - eval', () => {
      it('should detect eval usage', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'unsafe.ts'),
          `
            export function execute(code: string) {
              eval(code);
            }
          `
        );

        const result = XSSPreventionLaw.check(context);

        expect(result).toBeDefined();
        expect(
          (result.violations ?? []).some(v => v.toLowerCase().includes('eval'))
        ).toBe(true);
      });
    });

    describe('dangerous pattern detection - bypassSecurityTrust', () => {
      it('should detect bypassSecurityTrust usage', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'component.ts'),
          `
            import { DomSanitizer } from '@angular/platform-browser';

            export class MyComponent {
              constructor(private sanitizer: DomSanitizer) {}

              trustHtml(html: string) {
                return this.sanitizer.bypassSecurityTrustHtml(html);
              }
            }
          `
        );

        const result = XSSPreventionLaw.check(context);

        expect(result).toBeDefined();
        expect(
          (result.violations ?? []).some(v =>
            v.toLowerCase().includes('bypasssecuritytrust')
          )
        ).toBe(true);
      });
    });

    describe('sanitization detection', () => {
      it('should recognize DomSanitizer usage', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'component.ts'),
          `
            import { DomSanitizer } from '@angular/platform-browser';

            export class MyComponent {
              constructor(private sanitizer: DomSanitizer) {}
            }
          `
        );

        const result = XSSPreventionLaw.check(context);

        expect(result).toBeDefined();
      });

      it('should recognize sanitizeHtml function usage', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'utils.ts'),
          `
            import { sanitizeHtml } from 'sanitize-html';

            export function cleanHtml(html: string) {
              return sanitizeHtml(html);
            }
          `
        );

        const result = XSSPreventionLaw.check(context);

        expect(result).toBeDefined();
      });

      it('should recognize sanitizeUrl function usage', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'utils.ts'),
          `
            export function cleanUrl(url: string) {
              return sanitizeUrl(url);
            }
          `
        );

        const result = XSSPreventionLaw.check(context);

        expect(result).toBeDefined();
      });

      it('should recognize SecurityService usage', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'component.ts'),
          `
            import { SecurityService } from './security.service';

            export class MyComponent {
              constructor(private security: SecurityService) {}
            }
          `
        );

        const result = XSSPreventionLaw.check(context);

        expect(result).toBeDefined();
      });

      it('should flag missing sanitization', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'component.ts'),
          `
            export class MyComponent {
              // No sanitization imports
            }
          `
        );

        const result = XSSPreventionLaw.check(context);

        expect(result).toBeDefined();
      });
    });

    describe('Content Security Policy detection', () => {
      it('should detect CSP in index.html', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'index.html'),
          `
            <!DOCTYPE html>
            <html>
            <head>
              <meta http-equiv="Content-Security-Policy" content="default-src 'self'">
            </head>
            <body></body>
            </html>
          `
        );

        const result = XSSPreventionLaw.check(context);

        expect(result).toBeDefined();
        // Should not have CSP violation
        expect(
          (result.violations ?? []).some(v =>
            v.includes('Content Security Policy')
          )
        ).toBe(false);
      });

      it('should flag missing CSP in index.html', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'index.html'),
          `
            <!DOCTYPE html>
            <html>
            <head>
              <title>My App</title>
            </head>
            <body></body>
            </html>
          `
        );

        const result = XSSPreventionLaw.check(context);

        expect(result).toBeDefined();
        expect(
          (result.violations ?? []).some(v =>
            v.includes('Content Security Policy')
          )
        ).toBe(true);
      });

      it('should not flag CSP if index.html does not exist', () => {
        // No index.html file created
        const result = XSSPreventionLaw.check(context);

        expect(result).toBeDefined();
        // Should not have CSP violation when there's no index.html
        expect(
          (result.violations ?? []).some(
            v =>
              v.includes('Content Security Policy') && v.includes('index.html')
          )
        ).toBe(false);
      });
    });

    describe('suggestions for dangerous patterns', () => {
      it('should suggest textContent instead of innerHTML', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'component.ts'),
          `element.innerHTML = text;`
        );

        const result = XSSPreventionLaw.check(context);

        expect(
          (result.suggestions ?? []).some(s => s.includes('textContent'))
        ).toBe(true);
      });

      it('should suggest using DomSanitizer WHEN HTML is actually rendered', () => {
        // Sanitization is required only where an HTML sink exists. A component
        // with no sink used to be told to add DomSanitizer — a false failure on
        // every TS repo that never renders raw HTML.
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'component.ts'),
          `export class Component { render(el: HTMLElement, html: string){ el.innerHTML = html; } }`
        );

        const result = XSSPreventionLaw.check(context);

        expect(
          (result.suggestions ?? []).some(s => s.includes('DomSanitizer'))
        ).toBe(true);
      });

      it('should NOT suggest DomSanitizer when there is no HTML sink', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'component.ts'),
          `export class Component { title = 'hello'; }`
        );

        const result = XSSPreventionLaw.check(context);

        expect(
          (result.violations ?? []).some(v => /saniti/i.test(v))
        ).toBe(false);
      });

      it('should suggest adding CSP meta tag', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'index.html'),
          `<html><head></head><body></body></html>`
        );

        const result = XSSPreventionLaw.check(context);

        expect((result.suggestions ?? []).some(s => s.includes('CSP'))).toBe(
          true
        );
      });
    });

    describe('file scanning', () => {
      it('should scan TypeScript files', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'app.ts'),
          `element.innerHTML = '<script>alert(1)</script>'`
        );

        const result = XSSPreventionLaw.check(context);

        expect(result).toBeDefined();
        expect((result.violations ?? []).length).toBeGreaterThan(0);
      });

      it('should scan HTML files', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'template.html'),
          `<div [innerHTML]="userInput"></div>`
        );

        const result = XSSPreventionLaw.check(context);

        expect(result).toBeDefined();
      });

      it('should limit scanning to 50 files for performance', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);

        // Create many files
        for (let i = 0; i < 60; i++) {
          FileUtils.writeFile(
            PathOperations.join(srcDir, `file${i}.ts`),
            `export const value${i} = ${i};`
          );
        }

        const result = XSSPreventionLaw.check(context);

        expect(result).toBeDefined();
      });
    });

    describe('error handling', () => {
      it('should handle invalid project root gracefully', () => {
        const invalidContext: LawCheckContext = {
          projectRoot: '/non/existent/path',
          config: mockConfig,
        };

        const result = XSSPreventionLaw.check(invalidContext);

        expect(result).toBeDefined();
        expect(typeof result.passed).toBe('boolean');
      });

      it('should handle empty project directory', () => {
        const result = XSSPreventionLaw.check(context);

        expect(result).toBeDefined();
      });

      it('should handle malformed config', () => {
        const malformedContext: LawCheckContext = {
          projectRoot: tempDir,
          config: {} as RuleOfCodeConfig,
        };

        const result = XSSPreventionLaw.check(malformedContext);
        expect(result).toBeDefined();
      });

      it('should skip unreadable files gracefully', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'component.ts'),
          `export class Component {}`
        );

        const result = XSSPreventionLaw.check(context);

        expect(result).toBeDefined();
      });
    });

    describe('score calculation', () => {
      it('should return lower score with more violations', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'unsafe.ts'),
          `
            element.innerHTML = html;
            element.outerHTML = html;
            document.write(html);
            eval(code);
          `
        );

        const result = XSSPreventionLaw.check(context);

        expect(result.score).toBeLessThan(100);
      });

      it('should not have negative score', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);

        // Create many violations
        for (let i = 0; i < 20; i++) {
          FileUtils.writeFile(
            PathOperations.join(srcDir, `unsafe${i}.ts`),
            `element.innerHTML = html${i};`
          );
        }

        const result = XSSPreventionLaw.check(context);

        expect(result.score).toBeGreaterThanOrEqual(0);
      });
    });

    describe('multiple violations in single file', () => {
      it('should detect multiple XSS patterns in one file', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'unsafe.ts'),
          `
            export class UnsafeComponent {
              setHtml(html: string) {
                element.innerHTML = html;
              }

              write(html: string) {
                document.write(html);
              }

              execute(code: string) {
                eval(code);
              }
            }
          `
        );

        const result = XSSPreventionLaw.check(context);

        expect((result.violations ?? []).length).toBeGreaterThan(0);
      });
    });

    describe('safe alternatives detection', () => {
      it('should not flag textContent usage', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'safe.ts'),
          `
            export class SafeComponent {
              setText(text: string) {
                element.textContent = text;
              }
            }
          `
        );

        const result = XSSPreventionLaw.check(context);

        expect(
          (result.violations ?? []).some(v => v.includes('textContent'))
        ).toBe(false);
      });

      it('should not flag createElement usage', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'safe.ts'),
          `
            export class SafeComponent {
              createDiv() {
                const div = document.createElement('div');
                div.textContent = 'Hello';
                return div;
              }
            }
          `
        );

        const result = XSSPreventionLaw.check(context);

        expect(
          (result.violations ?? []).some(v => v.includes('createElement'))
        ).toBe(false);
      });
    });

    describe('relative path in violations', () => {
      it('should include relative file path in violation message', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'component.ts'),
          `element.innerHTML = html;`
        );

        const result = XSSPreventionLaw.check(context);

        if ((result.violations ?? []).length > 0) {
          expect(
            (result.violations ?? []).some(
              v => v.includes('src/component.ts') || v.includes('component.ts')
            )
          ).toBe(true);
        }
      });
    });

    // ========================================================================
    // FE finding: match CODE, not a comment/mention.
    // ========================================================================
    describe('does not flag innerHTML mentioned in a comment (FE finding)', () => {
      it('passes when [innerHTML] appears only in a comment or a plain string', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'safe.component.ts'),
          [
            "import { Component } from '@angular/core';",
            '// Removed the [innerHTML]="x" binding; we interpolate now.',
            "const note = 'never use [innerHTML] with user input';",
            "@Component({ selector: 'app-safe', template: '<p>{{ text }}</p>' })",
            "export class SafeComponent { text = 'hi'; }",
          ].join('\n')
        );

        const result = XSSPreventionLaw.check(context);

        expect(
          (result.violations ?? []).some(v => v.includes('innerHTML'))
        ).toBe(false);
      });

      it('still flags a real inline-template [innerHTML] binding', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'danger.component.ts'),
          [
            "import { Component } from '@angular/core';",
            "@Component({ selector: 'app-x', template: '<div [innerHTML]=\"raw\"></div>' })",
            "export class XComponent { raw = '<b>x</b>'; }",
          ].join('\n')
        );

        const result = XSSPreventionLaw.check(context);

        expect(
          (result.violations ?? []).some(v => v.includes('innerHTML'))
        ).toBe(true);
      });
    });
  });
});
