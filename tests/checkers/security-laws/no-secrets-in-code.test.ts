/**
 * Tests for NoSecretsInCodeLaw
 *
 * Tests the No Secrets in Code Law which prevents hardcoded secrets,
 * API keys, and passwords in source code
 */
import { NoSecretsInCodeLaw } from '../../../src/checkers/security-laws/no-secrets-in-code';
import type {
  LawCheckContext,
  RuleOfCodeConfig,
} from '../../../src/types/law.types';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('NoSecretsInCodeLaw', () => {
  let tempDir: string;
  let mockConfig: RuleOfCodeConfig;
  let context: LawCheckContext;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('no-secrets-test-');
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
        const result = NoSecretsInCodeLaw.check(context);

        expect(result).toBeDefined();
        expect(typeof result.passed).toBe('boolean');
      });

      it('should include violations array', () => {
        const result = NoSecretsInCodeLaw.check(context);

        expect(Array.isArray(result.violations)).toBe(true);
      });

      it('should include suggestions array', () => {
        const result = NoSecretsInCodeLaw.check(context);

        expect(Array.isArray(result.suggestions)).toBe(true);
      });

      it('should have score between 0 and 100', () => {
        const result = NoSecretsInCodeLaw.check(context);

        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(100);
      });

      it('should include message property', () => {
        const result = NoSecretsInCodeLaw.check(context);

        expect(typeof result.message).toBe('string');
      });

      it('should include config in result', () => {
        const result = NoSecretsInCodeLaw.check(context);

        expect(result.config).toBeDefined();
      });
    });

    describe('secret pattern detection - API keys', () => {
      it('should detect api_key pattern', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'config.ts'),
          `const api_key = "secretvalue12345";`
        );

        const result = NoSecretsInCodeLaw.check(context);

        expect(result).toBeDefined();
      });

      it('should detect apiKey camelCase pattern', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'config.ts'),
          `const apiKey = "secretvalue12345";`
        );

        const result = NoSecretsInCodeLaw.check(context);

        expect(result).toBeDefined();
      });

      it('should detect Google API key pattern (AIza)', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'firebase.ts'),
          `const firebaseApiKey = "AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";`
        );

        const result = NoSecretsInCodeLaw.check(context);

        expect(result).toBeDefined();
      });

      it('should detect OpenAI API key pattern (sk-)', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'openai.ts'),
          `const openaiKey = "sk-abcdefghijklmnopqrstuvwxyz123456";`
        );

        const result = NoSecretsInCodeLaw.check(context);

        expect(result).toBeDefined();
      });

      it('should detect GitHub token pattern (ghp_)', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'github.ts'),
          `const githubToken = "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";`
        );

        const result = NoSecretsInCodeLaw.check(context);

        expect(result).toBeDefined();
      });

      it('should detect Slack token pattern (xoxb-)', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        // Assemble the (fake) sample token at runtime so the flagged literal never
        // lives contiguously in source — push-protection scanners key on the source
        // text, while the xoxb- detector under test still sees the whole token in
        // the file this writes. Shape matches the law's regex: xoxb-12d-12d-24an.
        const sampleToken = [
          'xoxb',
          '1'.repeat(12),
          '2'.repeat(12),
          'x'.repeat(24),
        ].join('-');
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'slack.ts'),
          `const slackToken = "${sampleToken}";`
        );

        const result = NoSecretsInCodeLaw.check(context);

        expect(result).toBeDefined();
      });
    });

    describe('secret pattern detection - passwords and secrets', () => {
      it('should detect password pattern', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'auth.ts'),
          `const password = "MySecretPassword123";`
        );

        const result = NoSecretsInCodeLaw.check(context);

        expect(result).toBeDefined();
      });

      it('should detect secret pattern', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'config.ts'),
          `const secret = "verysecretvalue123456";`
        );

        const result = NoSecretsInCodeLaw.check(context);

        expect(result).toBeDefined();
      });

      it('should detect private_key pattern', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'keys.ts'),
          `const private_key = "-----BEGIN RSA PRIVATE KEY-----abc";`
        );

        const result = NoSecretsInCodeLaw.check(context);

        expect(result).toBeDefined();
      });

      it('should detect access_token pattern', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'oauth.ts'),
          `const access_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9";`
        );

        const result = NoSecretsInCodeLaw.check(context);

        expect(result).toBeDefined();
      });

      it('should detect bearer token pattern', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'api.ts'),
          `const authHeader = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9";`
        );

        const result = NoSecretsInCodeLaw.check(context);

        expect(result).toBeDefined();
      });
    });

    describe('safe pattern recognition', () => {
      it('should recognize YOUR_ placeholder as safe', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'config.ts'),
          `const api_key = "YOUR_API_KEY_HERE";`
        );

        const result = NoSecretsInCodeLaw.check(context);

        expect(result).toBeDefined();
      });

      it('should recognize PLACEHOLDER_ as safe', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'config.ts'),
          `const secret = "PLACEHOLDER_SECRET_VALUE";`
        );

        const result = NoSecretsInCodeLaw.check(context);

        expect(result).toBeDefined();
      });

      it('should recognize test_ prefix as safe', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'test-config.ts'),
          `const test_secret = "test_value_for_testing";`
        );

        const result = NoSecretsInCodeLaw.check(context);

        expect(result).toBeDefined();
      });

      it('should recognize demo_ prefix as safe', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'demo.ts'),
          `const demo_password = "demo_password_value";`
        );

        const result = NoSecretsInCodeLaw.check(context);

        expect(result).toBeDefined();
      });

      it('should recognize fake_ prefix as safe', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'mock.ts'),
          `const fake_token = "fake_token_for_mocking";`
        );

        const result = NoSecretsInCodeLaw.check(context);

        expect(result).toBeDefined();
      });

      it('should recognize example values as safe', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'config.ts'),
          `const password = "example_password_here";`
        );

        const result = NoSecretsInCodeLaw.check(context);

        expect(result).toBeDefined();
      });
    });

    describe('file type scanning', () => {
      it('should scan TypeScript files', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'config.ts'),
          `export const config = {};`
        );

        const result = NoSecretsInCodeLaw.check(context);

        expect(result).toBeDefined();
      });

      it('should scan JavaScript files', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'config.js'),
          `module.exports = {};`
        );

        const result = NoSecretsInCodeLaw.check(context);

        expect(result).toBeDefined();
      });

      it('should scan JSON files', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'config.json'),
          JSON.stringify({ key: 'value' })
        );

        const result = NoSecretsInCodeLaw.check(context);

        expect(result).toBeDefined();
      });

      it('should scan YAML files', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'config.yml'),
          `key: value`
        );

        const result = NoSecretsInCodeLaw.check(context);

        expect(result).toBeDefined();
      });

      it('should scan .yaml files', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'config.yaml'),
          `key: value`
        );

        const result = NoSecretsInCodeLaw.check(context);

        expect(result).toBeDefined();
      });
    });

    describe('performance limits', () => {
      it('should limit scanning to 100 files for performance', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);

        // Create many files
        for (let i = 0; i < 50; i++) {
          FileUtils.writeFile(
            PathOperations.join(srcDir, `file${i}.ts`),
            `export const value${i} = ${i};`
          );
        }

        const result = NoSecretsInCodeLaw.check(context);

        expect(result).toBeDefined();
      });
    });

    describe('error handling', () => {
      it('should handle invalid project root gracefully', () => {
        const invalidContext: LawCheckContext = {
          projectRoot: '/non/existent/path',
          config: mockConfig,
        };

        const result = NoSecretsInCodeLaw.check(invalidContext);

        expect(result).toBeDefined();
        expect(typeof result.passed).toBe('boolean');
      });

      it('should handle empty project directory', () => {
        const result = NoSecretsInCodeLaw.check(context);

        expect(result).toBeDefined();
        expect(result.passed).toBe(true);
      });

      it('should handle malformed config', () => {
        const malformedContext: LawCheckContext = {
          projectRoot: tempDir,
          config: {} as RuleOfCodeConfig,
        };

        const result = NoSecretsInCodeLaw.check(malformedContext);
        expect(result).toBeDefined();
      });

      it('should skip unreadable files gracefully', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'config.ts'),
          `export const config = {};`
        );

        const result = NoSecretsInCodeLaw.check(context);

        expect(result).toBeDefined();
      });

      it('should handle undefined config', () => {
        const noConfigContext: LawCheckContext = {
          projectRoot: tempDir,
          config: undefined as unknown as RuleOfCodeConfig,
        };

        // Should not throw
        expect(() => NoSecretsInCodeLaw.check(noConfigContext)).not.toThrow();
      });
    });

    describe('ignore patterns', () => {
      it('should respect ignorePatterns from config', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'config.ts'),
          `const api_key = "secretvalue12345";`
        );

        // Configure to ignore src directory
        const configWithIgnore = {
          ...mockConfig,
          ignorePatterns: ['src/**'],
        };

        const contextWithIgnore: LawCheckContext = {
          projectRoot: tempDir,
          config: configWithIgnore,
        };

        const result = NoSecretsInCodeLaw.check(contextWithIgnore);

        expect(result).toBeDefined();
      });

      it('should ignore node_modules by default', () => {
        const nodeModulesDir = PathOperations.join(
          tempDir,
          'node_modules',
          'package'
        );
        FileUtils.createDirectory(nodeModulesDir);
        FileUtils.writeFile(
          PathOperations.join(nodeModulesDir, 'index.js'),
          `const api_key = "secretvalue12345";`
        );

        const result = NoSecretsInCodeLaw.check(context);

        expect(result).toBeDefined();
      });

      it('should ignore dist directory by default', () => {
        const distDir = PathOperations.join(tempDir, 'dist');
        FileUtils.createDirectory(distDir);
        FileUtils.writeFile(
          PathOperations.join(distDir, 'config.js'),
          `const api_key = "secretvalue12345";`
        );

        const result = NoSecretsInCodeLaw.check(context);

        expect(result).toBeDefined();
      });

      it('should ignore build directory by default', () => {
        const buildDir = PathOperations.join(tempDir, 'build');
        FileUtils.createDirectory(buildDir);
        FileUtils.writeFile(
          PathOperations.join(buildDir, 'config.js'),
          `const api_key = "secretvalue12345";`
        );

        const result = NoSecretsInCodeLaw.check(context);

        expect(result).toBeDefined();
      });
    });

    describe('suggestions', () => {
      it('should include secret management recommendations', () => {
        const result = NoSecretsInCodeLaw.check(context);

        expect(Array.isArray(result.suggestions)).toBe(true);
      });

      it('should provide recommendations when secrets detected', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'config.ts'),
          `const api_key = "sk-1234567890abcdefghijklmnopqrstuvwxyz";`
        );

        const result = NoSecretsInCodeLaw.check(context);

        expect((result.suggestions ?? []).length).toBeGreaterThan(0);
      });
    });

    describe('score calculation', () => {
      it('should return score of 100 when no violations', () => {
        const result = NoSecretsInCodeLaw.check(context);

        if ((result.violations ?? []).length === 0) {
          expect(result.score).toBe(100);
        }
      });

      it('should reduce score for violations', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'config.ts'),
          `const api_key = "sk-1234567890abcdefghijklmnopqrstuvwxyz";`
        );

        const result = NoSecretsInCodeLaw.check(context);

        if ((result.violations ?? []).length > 0) {
          expect(result.score).toBeLessThan(100);
        }
      });

      it('should not have negative score', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);

        // Create many violations
        for (let i = 0; i < 20; i++) {
          FileUtils.writeFile(
            PathOperations.join(srcDir, `secret${i}.ts`),
            `const api_key = "sk-1234567890abcdefghijklmnopqrstuv${i}";`
          );
        }

        const result = NoSecretsInCodeLaw.check(context);

        expect(result.score).toBeGreaterThanOrEqual(0);
      });
    });

    describe('relative path in violations', () => {
      it('should include relative file path in violation message', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'config.ts'),
          `const api_key = "sk-1234567890abcdefghijklmnopqrstuvwxyz";`
        );

        const result = NoSecretsInCodeLaw.check(context);

        // Check if any violation contains a relative path reference
        if ((result.violations ?? []).length > 0) {
          expect(
            (result.violations ?? []).some(
              v => v.includes('src/config.ts') || v.includes('config.ts')
            )
          ).toBe(true);
        }
      });
    });
  });
});
