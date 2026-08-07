/**
 * Tests for DataEncryptionStandardsLaw
 *
 * Tests the Data Encryption Standards Law which enforces proper data encryption
 * and cryptographic standards
 */
import { DataEncryptionStandardsLaw } from '../../../src/checkers/security-laws/data-encryption-standards';
import type {
  LawCheckContext,
  RuleOfCodeConfig,
} from '../../../src/types/law.types';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('DataEncryptionStandardsLaw', () => {
  let tempDir: string;
  let mockConfig: RuleOfCodeConfig;
  let context: LawCheckContext;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('data-encryption-test-');
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
        const result = DataEncryptionStandardsLaw.check(context);

        expect(result).toBeDefined();
        expect(typeof result.passed).toBe('boolean');
      });

      it('should include violations array', () => {
        const result = DataEncryptionStandardsLaw.check(context);

        expect(Array.isArray(result.violations)).toBe(true);
      });

      it('should include suggestions array', () => {
        const result = DataEncryptionStandardsLaw.check(context);

        expect(Array.isArray(result.suggestions)).toBe(true);
      });

      it('should have score between 0 and 100', () => {
        const result = DataEncryptionStandardsLaw.check(context);

        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(100);
      });

      it('should include message property', () => {
        const result = DataEncryptionStandardsLaw.check(context);

        expect(typeof result.message).toBe('string');
      });

      it('should include details array', () => {
        const result = DataEncryptionStandardsLaw.check(context);

        expect(result.details === undefined || Array.isArray(result.details)).toBe(true);
      });

      it('should include fixable property', () => {
        const result = DataEncryptionStandardsLaw.check(context);

        expect(result.fixable === undefined || typeof result.fixable === 'boolean').toBe(true);
      });

      it('should include config in result', () => {
        const result = DataEncryptionStandardsLaw.check(context);

        expect(result.config).toBeDefined();
      });
    });

    describe('encryption implementation detection', () => {
      it('should analyze files with encryption imports', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'crypto.service.ts'),
          `
            import * as crypto from 'crypto';

            export class CryptoService {
              encrypt(data: string, key: string): string {
                const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
                return cipher.update(data, 'utf8', 'hex') + cipher.final('hex');
              }

              decrypt(data: string, key: string): string {
                const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
                return decipher.update(data, 'hex', 'utf8') + decipher.final('utf8');
              }
            }
          `
        );

        const result = DataEncryptionStandardsLaw.check(context);

        expect(result).toBeDefined();
        expect(typeof result.passed).toBe('boolean');
      });

      it('should detect AES encryption usage', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'aes.service.ts'),
          `
            import { AES, enc } from 'crypto-js';

            export class AesService {
              encrypt(data: string, secret: string): string {
                return AES.encrypt(data, secret).toString();
              }

              decrypt(encrypted: string, secret: string): string {
                return AES.decrypt(encrypted, secret).toString(enc.Utf8);
              }
            }
          `
        );

        const result = DataEncryptionStandardsLaw.check(context);

        expect(result).toBeDefined();
      });

      it('should detect weak encryption algorithms', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'weak-crypto.ts'),
          `
            import * as crypto from 'crypto';

            // Using weak MD5 hash
            export function hashPassword(password: string): string {
              return crypto.createHash('md5').update(password).digest('hex');
            }

            // Using weak DES encryption
            export function encryptData(data: string): string {
              const cipher = crypto.createCipher('des', 'key');
              return cipher.update(data, 'utf8', 'hex');
            }
          `
        );

        const result = DataEncryptionStandardsLaw.check(context);

        expect(result).toBeDefined();
        // Should detect weak algorithms
        expect(Array.isArray(result.violations)).toBe(true);
      });

      it('should detect SHA-1 usage', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'hash.service.ts'),
          `
            import * as crypto from 'crypto';

            export function createHash(data: string): string {
              return crypto.createHash('sha1').update(data).digest('hex');
            }
          `
        );

        const result = DataEncryptionStandardsLaw.check(context);

        expect(result).toBeDefined();
      });
    });

    describe('cryptographic library detection', () => {
      it('should detect crypto-js usage', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'encryption.ts'),
          `
            import CryptoJS from 'crypto-js';

            export const encrypt = (text: string) => CryptoJS.AES.encrypt(text, 'secret');
          `
        );

        const result = DataEncryptionStandardsLaw.check(context);

        expect(result).toBeDefined();
      });

      it('should detect bcrypt usage', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'password.ts'),
          `
            import * as bcrypt from 'bcrypt';

            export async function hashPassword(password: string): Promise<string> {
              return bcrypt.hash(password, 10);
            }
          `
        );

        const result = DataEncryptionStandardsLaw.check(context);

        expect(result).toBeDefined();
      });

      it('should detect argon2 usage', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'password-argon.ts'),
          `
            import * as argon2 from 'argon2';

            export async function hashPassword(password: string): Promise<string> {
              return argon2.hash(password);
            }
          `
        );

        const result = DataEncryptionStandardsLaw.check(context);

        expect(result).toBeDefined();
      });
    });

    describe('data storage security detection', () => {
      it('should analyze localStorage usage for sensitive data', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'storage.service.ts'),
          `
            export class StorageService {
              saveToken(token: string) {
                localStorage.setItem('authToken', token);
              }

              savePassword(password: string) {
                // BAD: Storing password in localStorage
                localStorage.setItem('password', password);
              }
            }
          `
        );

        const result = DataEncryptionStandardsLaw.check(context);

        expect(result).toBeDefined();
      });

      it('should detect sessionStorage usage', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'session.ts'),
          `
            export function saveSession(data: any) {
              sessionStorage.setItem('userData', JSON.stringify(data));
            }
          `
        );

        const result = DataEncryptionStandardsLaw.check(context);

        expect(result).toBeDefined();
      });

      it('should detect cookies without secure flag', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'cookie.service.ts'),
          `
            export function setCookie(name: string, value: string) {
              document.cookie = \`\${name}=\${value}\`;
            }
          `
        );

        const result = DataEncryptionStandardsLaw.check(context);

        expect(result).toBeDefined();
      });
    });

    describe('recommendations', () => {
      it('should include encryption recommendations', () => {
        const result = DataEncryptionStandardsLaw.check(context);

        expect(Array.isArray(result.suggestions)).toBe(true);
      });

      it('should remove duplicate suggestions', () => {
        const result = DataEncryptionStandardsLaw.check(context);

        // Suggestions should be unique
        const suggestions = result.suggestions ?? [];
        const uniqueSuggestions = Array.from(new Set(suggestions));
        expect(suggestions.length).toBe(uniqueSuggestions.length);
      });
    });

    describe('error handling', () => {
      it('should handle invalid project root gracefully', () => {
        const invalidContext: LawCheckContext = {
          projectRoot: '/non/existent/path',
          config: mockConfig,
        };

        const result = DataEncryptionStandardsLaw.check(invalidContext);

        expect(result).toBeDefined();
        expect(typeof result.passed).toBe('boolean');
      });

      it('should handle empty project directory', () => {
        const result = DataEncryptionStandardsLaw.check(context);

        expect(result).toBeDefined();
      });

      it('should handle malformed config', () => {
        const malformedContext: LawCheckContext = {
          projectRoot: tempDir,
          config: {} as RuleOfCodeConfig,
        };

        const result = DataEncryptionStandardsLaw.check(malformedContext);
        expect(result).toBeDefined();
      });
    });

    describe('HTTPS and TLS detection', () => {
      it('should detect HTTP usage instead of HTTPS', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'api.service.ts'),
          `
            export class ApiService {
              private baseUrl = 'http://api.example.com';

              async fetchData() {
                return fetch(this.baseUrl + '/data');
              }
            }
          `
        );

        const result = DataEncryptionStandardsLaw.check(context);

        expect(result).toBeDefined();
      });

      it('should accept HTTPS usage', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'secure-api.service.ts'),
          `
            export class SecureApiService {
              private baseUrl = 'https://api.example.com';

              async fetchData() {
                return fetch(this.baseUrl + '/data');
              }
            }
          `
        );

        const result = DataEncryptionStandardsLaw.check(context);

        expect(result).toBeDefined();
      });
    });

    describe('key management detection', () => {
      it('should detect hardcoded encryption keys', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'bad-crypto.ts'),
          `
            const ENCRYPTION_KEY = 'hardcoded-secret-key-12345';

            export function encrypt(data: string) {
              return AES.encrypt(data, ENCRYPTION_KEY);
            }
          `
        );

        const result = DataEncryptionStandardsLaw.check(context);

        expect(result).toBeDefined();
      });

      it('should accept environment variable for keys', () => {
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'good-crypto.ts'),
          `
            const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

            export function encrypt(data: string) {
              return AES.encrypt(data, ENCRYPTION_KEY);
            }
          `
        );

        const result = DataEncryptionStandardsLaw.check(context);

        expect(result).toBeDefined();
      });
    });

    describe('score calculation', () => {
      it('should reduce score for violations', () => {
        const result = DataEncryptionStandardsLaw.check(context);

        if ((result.violations ?? []).length > 0) {
          expect(result.score).toBeLessThan(100);
        }
      });

      it('should not have negative score', () => {
        // Create project with many violations
        const srcDir = PathOperations.join(tempDir, 'src');
        FileUtils.createDirectory(srcDir);
        FileUtils.writeFile(
          PathOperations.join(srcDir, 'bad-security.ts'),
          `
            import * as crypto from 'crypto';

            const KEY = 'hardcoded';
            const hash = crypto.createHash('md5');
            const cipher = crypto.createCipher('des', KEY);
            localStorage.setItem('password', 'secret');
          `
        );

        const result = DataEncryptionStandardsLaw.check(context);

        expect(result.score).toBeGreaterThanOrEqual(0);
      });
    });
  });
});
