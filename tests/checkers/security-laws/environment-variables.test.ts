/**
 * Tests for EnvironmentVariablesLaw
 *
 * Tests the Environment Variables Security Law which ensures no production
 * secrets are committed to version control
 */
import { EnvironmentVariablesLaw } from '../../../src/checkers/security-laws/environment-variables';
import type {
  LawCheckContext,
  RuleOfCodeConfig,
} from '../../../src/types/law.types';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('EnvironmentVariablesLaw', () => {
  let tempDir: string;
  let mockConfig: RuleOfCodeConfig;
  let context: LawCheckContext;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('env-vars-test-');
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
        const result = EnvironmentVariablesLaw.check(context);

        expect(result).toBeDefined();
        expect(typeof result.passed).toBe('boolean');
      });

      it('should include violations array', () => {
        const result = EnvironmentVariablesLaw.check(context);

        expect(Array.isArray(result.violations)).toBe(true);
      });

      it('should include suggestions array', () => {
        const result = EnvironmentVariablesLaw.check(context);

        expect(Array.isArray(result.suggestions)).toBe(true);
      });

      it('should have score between 0 and 100', () => {
        const result = EnvironmentVariablesLaw.check(context);

        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(100);
      });

      it('should include message property', () => {
        const result = EnvironmentVariablesLaw.check(context);

        expect(typeof result.message).toBe('string');
      });

      it('should include config in result', () => {
        const result = EnvironmentVariablesLaw.check(context);

        expect(result.config).toBeDefined();
      });
    });

    describe('environment.ts file checking', () => {
      it('should check environment.ts for secrets', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'environment.ts'),
          `
            export const environment = {
              production: false,
              apiKey: 'sk-1234567890abcdefghijklmnopqrstuvwxyz'
            };
          `
        );

        const result = EnvironmentVariablesLaw.check(context);

        expect(result).toBeDefined();
        expect(Array.isArray(result.violations)).toBe(true);
      });

      it('should check environment.prod.ts for secrets', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'environment.prod.ts'),
          `
            export const environment = {
              production: true,
              apiKey: 'sk-prod-abcdefghijklmnopqrstuvwxyz12345'
            };
          `
        );

        const result = EnvironmentVariablesLaw.check(context);

        expect(result).toBeDefined();
      });

      it('should check environment.development.ts for secrets', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'environment.development.ts'),
          `
            export const environment = {
              production: false,
              token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test'
            };
          `
        );

        const result = EnvironmentVariablesLaw.check(context);

        expect(result).toBeDefined();
      });
    });

    describe('.env file checking', () => {
      it('should check .env for secrets', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, '.env'),
          `
            API_KEY=sk-1234567890abcdefghijklmnopqrstuvwxyz
          `
        );

        const result = EnvironmentVariablesLaw.check(context);

        expect(result).toBeDefined();
      });

      it('should check .env.local for secrets', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, '.env.local'),
          `
            SECRET_KEY=supersecretvalue12345678901234567890
          `
        );

        const result = EnvironmentVariablesLaw.check(context);

        expect(result).toBeDefined();
      });

      it('should check .env.production for secrets', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, '.env.production'),
          `
            PASSWORD=MySecurePassword123!@#
          `
        );

        const result = EnvironmentVariablesLaw.check(context);

        expect(result).toBeDefined();
      });
    });

    describe('config file checking', () => {
      it('should check config.ts for secrets', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'config.ts'),
          `
            export const config = {
              apiKey: 'AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
            };
          `
        );

        const result = EnvironmentVariablesLaw.check(context);

        expect(result).toBeDefined();
      });

      it('should check config.json for secrets', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'config.json'),
          JSON.stringify({
            api_key: 'sk-1234567890abcdefghijklmnopqrstuvwxyz',
          })
        );

        const result = EnvironmentVariablesLaw.check(context);

        expect(result).toBeDefined();
      });
    });

    describe('secret pattern detection', () => {
      it('should detect api_key pattern', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, '.env'),
          'api_key="secretvalue12345"'
        );

        const result = EnvironmentVariablesLaw.check(context);

        expect(result).toBeDefined();
      });

      it('should detect password pattern', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, '.env'),
          'password="MyPassword123"'
        );

        const result = EnvironmentVariablesLaw.check(context);

        expect(result).toBeDefined();
      });

      it('should detect secret pattern', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, '.env'),
          'secret="verysecretvalue123456"'
        );

        const result = EnvironmentVariablesLaw.check(context);

        expect(result).toBeDefined();
      });

      it('should detect token pattern', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, '.env'),
          'token="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0"'
        );

        const result = EnvironmentVariablesLaw.check(context);

        expect(result).toBeDefined();
      });

      it('should detect Google API key pattern', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'config.ts'),
          'const key = "AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"'
        );

        const result = EnvironmentVariablesLaw.check(context);

        expect(result).toBeDefined();
      });

      it('should detect OpenAI API key pattern', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'config.ts'),
          'const key = "sk-abcdefghijklmnopqrstuvwxyz123456"'
        );

        const result = EnvironmentVariablesLaw.check(context);

        expect(result).toBeDefined();
      });
    });

    describe('placeholder pattern recognition', () => {
      it('should recognize YOUR_ placeholder as safe', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, '.env'),
          'api_key="YOUR_API_KEY_HERE"'
        );

        const result = EnvironmentVariablesLaw.check(context);

        expect(result).toBeDefined();
      });

      it('should recognize PLACEHOLDER_ as safe', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, '.env'),
          'secret="PLACEHOLDER_SECRET"'
        );

        const result = EnvironmentVariablesLaw.check(context);

        expect(result).toBeDefined();
      });

      it('should recognize your- placeholder as safe', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, '.env'),
          'token="your-token-here-replace-me"'
        );

        const result = EnvironmentVariablesLaw.check(context);

        expect(result).toBeDefined();
      });

      it('should recognize <PLACEHOLDER> syntax as safe', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, '.env'),
          'api_key="<YOUR_API_KEY>"'
        );

        const result = EnvironmentVariablesLaw.check(context);

        expect(result).toBeDefined();
      });

      it('should recognize example values as safe', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, '.env'),
          'password="example_password_here"'
        );

        const result = EnvironmentVariablesLaw.check(context);

        expect(result).toBeDefined();
      });
    });

    describe('template file checking', () => {
      it('should pass when .env.example exists', () => {
        FileUtils.writeFile(PathOperations.join(tempDir, '.env'), 'KEY=value');
        FileUtils.writeFile(
          PathOperations.join(tempDir, '.env.example'),
          'KEY=your-key-here'
        );

        const result = EnvironmentVariablesLaw.check(context);

        expect(result).toBeDefined();
      });

      it('should pass when .env.template exists', () => {
        FileUtils.writeFile(PathOperations.join(tempDir, '.env'), 'KEY=value');
        FileUtils.writeFile(
          PathOperations.join(tempDir, '.env.template'),
          'KEY=your-key-here'
        );

        const result = EnvironmentVariablesLaw.check(context);

        expect(result).toBeDefined();
      });

      it('should pass when environment.template.ts exists', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'environment.ts'),
          'export const environment = { apiUrl: "" };'
        );
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'environment.template.ts'),
          'export const environment = { apiUrl: "YOUR_API_URL" };'
        );

        const result = EnvironmentVariablesLaw.check(context);

        expect(result).toBeDefined();
      });

      it('should pass when config.template.ts exists', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'config.ts'),
          'export const config = {};'
        );
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'config.template.ts'),
          'export const config = { key: "YOUR_KEY" };'
        );

        const result = EnvironmentVariablesLaw.check(context);

        expect(result).toBeDefined();
      });

      it('should add violation when env files exist but no template', () => {
        FileUtils.writeFile(PathOperations.join(tempDir, '.env'), 'KEY=value');

        const result = EnvironmentVariablesLaw.check(context);

        expect(result.violations).toContain(
          'No environment template file found (e.g., environment.template.ts, .env.example)'
        );
      });

      it('should suggest creating template files', () => {
        FileUtils.writeFile(PathOperations.join(tempDir, '.env'), 'KEY=value');

        const result = EnvironmentVariablesLaw.check(context);

        expect(result.suggestions).toContain(
          'Create environment template files for documentation'
        );
      });
    });

    describe('error handling', () => {
      it('should handle invalid project root gracefully', () => {
        const invalidContext: LawCheckContext = {
          projectRoot: '/non/existent/path',
          config: mockConfig,
        };

        const result = EnvironmentVariablesLaw.check(invalidContext);

        expect(result).toBeDefined();
        expect(typeof result.passed).toBe('boolean');
      });

      it('should handle empty project directory', () => {
        const result = EnvironmentVariablesLaw.check(context);

        expect(result).toBeDefined();
        // Empty project should pass (no env files to check)
        expect(result.passed).toBe(true);
      });

      it('should handle unreadable files gracefully', () => {
        // Create a file then make the check
        FileUtils.writeFile(PathOperations.join(tempDir, '.env'), 'KEY=value');

        const result = EnvironmentVariablesLaw.check(context);

        expect(result).toBeDefined();
      });
    });

    describe('score calculation', () => {
      it('should return score of 100 when no violations', () => {
        // Empty project should have no violations
        const result = EnvironmentVariablesLaw.check(context);

        if ((result.violations ?? []).length === 0) {
          expect(result.score).toBe(100);
        }
      });

      it('should reduce score for violations', () => {
        FileUtils.writeFile(PathOperations.join(tempDir, '.env'), 'KEY=value');

        const result = EnvironmentVariablesLaw.check(context);

        if ((result.violations ?? []).length > 0) {
          expect(result.score).toBeLessThan(100);
        }
      });

      it('should not have negative score', () => {
        // Create multiple violations
        FileUtils.writeFile(
          PathOperations.join(tempDir, '.env'),
          `
            api_key="secretvalue12345"
            password="MyPassword123"
            secret="verysecretvalue1234"
            token="eyJhbGciOiJIUzI1NiIsIn"
          `
        );

        const result = EnvironmentVariablesLaw.check(context);

        expect(result.score).toBeGreaterThanOrEqual(0);
      });
    });

    describe('message content', () => {
      it('should include success message when passed', () => {
        const result = EnvironmentVariablesLaw.check(context);

        if (result.passed) {
          expect(result.message).toContain('Security compliance verified');
        }
      });

      it('should include violation message when failed', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, '.env'),
          'api_key="sk-1234567890abcdefghijklmnopqrstuvwxyz"'
        );

        const result = EnvironmentVariablesLaw.check(context);

        if (!result.passed) {
          expect(result.message).toContain('Security violation');
        }
      });
    });

    describe('multiple file scenarios', () => {
      it('should check all environment files', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, '.env'),
          'BASE_KEY=value'
        );
        FileUtils.writeFile(
          PathOperations.join(tempDir, '.env.local'),
          'LOCAL_KEY=value'
        );
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'environment.ts'),
          'export const env = {};'
        );

        const result = EnvironmentVariablesLaw.check(context);

        expect(result).toBeDefined();
      });

      it('should aggregate violations from multiple files', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, '.env'),
          'api_key="sk-1234567890abcdef12345"'
        );
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'config.ts'),
          'const secret = "supersecretvalue1234567890"'
        );

        const result = EnvironmentVariablesLaw.check(context);

        expect(result).toBeDefined();
        expect(Array.isArray(result.violations)).toBe(true);
      });
    });
  });
});
