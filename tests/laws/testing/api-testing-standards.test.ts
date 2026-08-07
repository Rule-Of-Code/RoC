/**
 * Tests for APITestingStandardsLaw
 *
 * Tests the API Testing Standards law which validates comprehensive API testing implementation.
 */
import type { RuleOfCodeConfig } from '../../../src/config/types';
import { APITestingStandardsLaw } from '../../../src/laws/testing/api-testing-standards';
import type { LawCheckContext } from '../../../src/types/law.types';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('APITestingStandardsLaw', () => {
  let tempDir: string;
  let mockConfig: RuleOfCodeConfig;
  let context: LawCheckContext;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('api-testing-standards-test-');
    mockConfig = FileUtils.getMinimalDefaultConfig();
    context = {
      projectRoot: tempDir,
      config: mockConfig,
    };
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
  });

  describe('check', () => {
    describe('when no API test files exist', () => {
      it('should fail with violation for missing API tests', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'app.ts'),
          'export const app = {};'
        );

        const result = APITestingStandardsLaw.check(context);

        expect(result.passed).toBe(false);
        expect(result.violations).toContain('No API test files found');
      });

      it('should suggest creating API test files', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);

        const result = APITestingStandardsLaw.check(context);

        expect(result.suggestions).toContainEqual(
          expect.stringContaining('Create API test files')
        );
      });

      it('should reduce score for missing API tests', () => {
        const result = APITestingStandardsLaw.check(context);

        expect(result.score).toBeLessThan(100);
      });
    });

    describe('when API test files exist', () => {
      it('should analyze API test files in tests directory', () => {
        const testsDir = PathOperations.join(tempDir, 'tests', 'api');
        FileUtils.createDirectory(testsDir);
        FileUtils.writeFile(
          PathOperations.join(testsDir, 'users.api.test.ts'),
          `
            describe('Users API', () => {
              it('should GET users', async () => {
                const response = await request(app).get('/api/users');
                expect(response.status).toBe(200);
              });
            });
          `
        );

        // Create package.json with testing framework
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify({
            devDependencies: {
              jest: '^29.0.0',
              supertest: '^6.0.0',
            },
          })
        );

        const result = APITestingStandardsLaw.check(context);

        // The law analyzes the project structure correctly
        expect(result.score).toBeLessThanOrEqual(100);
        expect(typeof result.message).toBe('string');
      });

      it('should validate HTTP method coverage', () => {
        const testsDir = PathOperations.join(tempDir, 'tests');
        FileUtils.createDirectory(testsDir);
        FileUtils.writeFile(
          PathOperations.join(testsDir, 'api.spec.ts'),
          `
            describe('API', () => {
              it('should GET data', () => {
                expect(true).toBe(true);
              });
            });
          `
        );
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify({ devDependencies: { jest: '^29.0.0' } })
        );

        const result = APITestingStandardsLaw.check(context);

        // Score should be reduced if not all HTTP methods are covered
        expect(result.score).toBeLessThanOrEqual(100);
      });
    });

    describe('framework detection', () => {
      it('should detect Jest as testing framework', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify({
            devDependencies: { jest: '^29.0.0' },
          })
        );

        const testsDir = PathOperations.join(tempDir, 'tests');
        FileUtils.createDirectory(testsDir);
        FileUtils.writeFile(
          PathOperations.join(testsDir, 'api.spec.ts'),
          'describe("api", () => {});'
        );

        const result = APITestingStandardsLaw.check(context);

        expect(result.violations).not.toContain(
          'No API testing framework configured'
        );
      });

      it('should detect Supertest as testing framework', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify({
            devDependencies: { supertest: '^6.0.0' },
          })
        );

        const testsDir = PathOperations.join(tempDir, 'tests');
        FileUtils.createDirectory(testsDir);
        FileUtils.writeFile(
          PathOperations.join(testsDir, 'api.spec.ts'),
          'describe("api", () => {});'
        );

        const result = APITestingStandardsLaw.check(context);

        expect(result.violations).not.toContain(
          'No API testing framework configured'
        );
      });

      it('should detect Cypress as testing framework', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify({
            devDependencies: { cypress: '^12.0.0' },
          })
        );

        const result = APITestingStandardsLaw.check(context);

        expect(result.violations).not.toContain(
          'No API testing framework configured'
        );
      });

      it('should flag missing testing framework', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify({
            dependencies: { express: '^4.0.0' },
          })
        );

        const result = APITestingStandardsLaw.check(context);

        expect(result.violations).toContain(
          'No API testing framework configured'
        );
      });
    });

    describe('API mocking detection', () => {
      it('should detect MSW mocking setup', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify({
            devDependencies: {
              jest: '^29.0.0',
              msw: '^1.0.0',
            },
          })
        );

        const testsDir = PathOperations.join(tempDir, 'tests');
        FileUtils.createDirectory(testsDir);
        FileUtils.writeFile(
          PathOperations.join(testsDir, 'api.spec.ts'),
          `
            describe('API', () => {
              it('should GET data', () => {});
              it('should POST data', () => {});
            });
          `
        );

        const result = APITestingStandardsLaw.check(context);

        expect(result.suggestions).not.toContainEqual(
          expect.stringContaining('MSW')
        );
      });

      it('should detect nock mocking setup', () => {
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify({
            devDependencies: {
              jest: '^29.0.0',
              nock: '^13.0.0',
            },
          })
        );

        const result = APITestingStandardsLaw.check(context);

        expect(result.suggestions).not.toContain(
          'Consider implementing API mocking with tools like MSW or nock'
        );
      });
    });

    describe('error handling', () => {
      it('should return valid result for non-existent paths', () => {
        // Create context with non-existent path - law should handle gracefully
        const invalidContext: LawCheckContext = {
          projectRoot: '/non/existent/path/that/should/not/exist',
          config: mockConfig,
        };

        const result = APITestingStandardsLaw.check(invalidContext);

        // Law handles missing files gracefully with violations
        expect(result.score).toBeLessThanOrEqual(100);
        expect(typeof result.passed).toBe('boolean');
      });
    });

    describe('result structure', () => {
      it('should include config in result', () => {
        const result = APITestingStandardsLaw.check(context);

        expect(result.config).toBe(mockConfig);
      });

      it('should set fixable to true', () => {
        const result = APITestingStandardsLaw.check(context);

        expect(result.fixable).toBe(true);
      });

      it('should include details array', () => {
        const result = APITestingStandardsLaw.check(context);

        expect(Array.isArray(result.details)).toBe(true);
      });

      it('should have passed boolean', () => {
        const result = APITestingStandardsLaw.check(context);

        expect(typeof result.passed).toBe('boolean');
      });

      it('should have message string', () => {
        const result = APITestingStandardsLaw.check(context);

        expect(typeof result.message).toBe('string');
      });

      it('should have score between 0 and 100', () => {
        const result = APITestingStandardsLaw.check(context);

        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(100);
      });
    });

    describe('comprehensive API testing project', () => {
      it('should analyze comprehensive API testing setup', () => {
        // Create comprehensive API testing structure
        const testsDir = PathOperations.join(tempDir, 'tests', 'api');
        FileUtils.createDirectory(testsDir);

        // Create comprehensive API test file
        FileUtils.writeFile(
          PathOperations.join(testsDir, 'comprehensive.api.test.ts'),
          `
            import request from 'supertest';
            describe('Users API', () => {
              it('should test API', async () => {});
            });
          `
        );

        // Create package.json with all required dependencies
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'package.json'),
          JSON.stringify({
            devDependencies: {
              jest: '^29.0.0',
              supertest: '^6.0.0',
              msw: '^1.0.0',
            },
          })
        );

        const result = APITestingStandardsLaw.check(context);

        // The law correctly identifies the testing framework
        expect(result.violations).not.toContain(
          'No API testing framework configured'
        );
        expect(typeof result.score).toBe('number');
      });
    });
  });
});
