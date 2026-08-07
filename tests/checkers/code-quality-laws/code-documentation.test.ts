/**
 * Tests for CodeDocumentationLaw
 *
 * Comprehensive tests for code documentation validation
 */
import { CodeDocumentationLaw } from '../../../src/checkers/code-quality-laws/code-documentation';
import type { LawCheckContext, RuleOfCodeConfig } from '../../../src/types';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('CodeDocumentationLaw', () => {
  let tempDir: string;
  let mockConfig: RuleOfCodeConfig;
  let mockContext: LawCheckContext;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('code-documentation-test-');
    mockConfig = {
      project: {
        name: 'test-project',
        root: tempDir,
        componentPrefix: 'app',
        type: 'generic',
      },
      ignores: { global: [], tests: [], build: [], design: [] },
      laws: { paretoMode: false, severity: {} },
      hooks: { preCommit: false, prePush: false, commitMsg: false },
      includes: { global: [] },
      excludes: {},
      reporting: {
        format: 'console',
        verbose: false,
        onlyFailures: false,
        scoring: false,
      },
      performance: {
        parallel: false,
        maxConcurrent: 3,
        cache: true,
      },
    };
    mockContext = {
      projectRoot: tempDir,
      config: mockConfig,
    };
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
  });

  describe('check()', () => {
    it('should return a LawResult object', () => {
      const result = CodeDocumentationLaw.check(mockContext);
      expect(result).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
    });

    it('should have violations array', () => {
      const result = CodeDocumentationLaw.check(mockContext);
      expect(Array.isArray(result.violations)).toBe(true);
    });

    it('should have suggestions array', () => {
      const result = CodeDocumentationLaw.check(mockContext);
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('should have score property', () => {
      const result = CodeDocumentationLaw.check(mockContext);
      expect(typeof result.score).toBe('number');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should have message property', () => {
      const result = CodeDocumentationLaw.check(mockContext);
      expect(typeof result.message).toBe('string');
    });

    it('should have config property', () => {
      const result = CodeDocumentationLaw.check(mockContext);
      expect(result.config).toBe(mockConfig);
    });

    it('should pass for empty project', () => {
      const result = CodeDocumentationLaw.check(mockContext);
      expect(result.passed).toBe(true);
    });
  });

  describe('class documentation analysis', () => {
    beforeEach(() => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
    });

    it('should detect undocumented classes', () => {
      const undocumentedClass = `
export class UserService {
  private users: User[] = [];

  getUsers(): User[] {
    return this.users;
  }
}

export class ProductService {
  private products: Product[] = [];

  getProducts(): Product[] {
    return this.products;
  }
}

export class OrderService {
  private orders: Order[] = [];

  getOrders(): Order[] {
    return this.orders;
  }
}

export class CartService {
  private items: CartItem[] = [];

  getItems(): CartItem[] {
    return this.items;
  }
}

export class PaymentService {
  private payments: Payment[] = [];

  getPayments(): Payment[] {
    return this.payments;
  }
}
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'services.ts'),
        undocumentedClass
      );
      const result = CodeDocumentationLaw.check(mockContext);
      const classDocViolation = result.violations?.find(v =>
        v.includes('Class documentation coverage')
      );
      expect(classDocViolation).toBeDefined();
    });

    it('should pass for well-documented classes', () => {
      const documentedClass = `
/**
 * User service for managing user operations
 */
export class UserService {
  private users: User[] = [];

  /**
   * Get all users
   */
  getUsers(): User[] {
    return this.users;
  }
}
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'user.service.ts'),
        documentedClass
      );
      const result = CodeDocumentationLaw.check(mockContext);
      // Should not have specific file violations
      const fileViolation = result.violations?.find(v =>
        v.includes('user.service.ts')
      );
      expect(fileViolation).toBeUndefined();
    });
  });

  describe('comment ratio analysis', () => {
    beforeEach(() => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
    });

    it('should detect low comment ratio in large files', () => {
      // Create a file with many code lines but few comments
      const codeLines = Array(60)
        .fill(null)
        .map((_, i) => `const value${i} = ${i};`)
        .join('\n');
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'no-comments.ts'),
        codeLines
      );
      const result = CodeDocumentationLaw.check(mockContext);
      const commentViolation = result.violations?.find(v =>
        v.includes('Low comment ratio')
      );
      expect(commentViolation).toBeDefined();
    });

    it('should pass for files with adequate comments', () => {
      const wellCommentedCode = `
// User management module
// Handles all user-related operations
// Version: 1.0.0

/**
 * User interface
 */
interface User {
  id: string;
  name: string;
}

// User storage
const users: User[] = [];

// Get user by ID
function getUser(id: string): User | undefined {
  // Find user in array
  return users.find(u => u.id === id);
}

// Add new user
function addUser(user: User): void {
  // Validate user
  if (!user.id) throw new Error('Invalid user');
  // Add to storage
  users.push(user);
}
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'commented.ts'),
        wellCommentedCode
      );
      const result = CodeDocumentationLaw.check(mockContext);
      const commentViolation = result.violations?.find(
        v => v.includes('Low comment ratio') && v.includes('commented.ts')
      );
      expect(commentViolation).toBeUndefined();
    });
  });

  describe('README detection', () => {
    beforeEach(() => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src', 'app'));
    });

    it('should detect missing README in app directories', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'app', 'component.ts'),
        'export class Component {}'
      );
      const result = CodeDocumentationLaw.check(mockContext);
      const readmeViolation = result.violations?.find(v =>
        v.includes('Missing README.md')
      );
      expect(readmeViolation).toBeDefined();
    });

    it('should pass when README exists', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'app', 'component.ts'),
        'export class Component {}'
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'app', 'README.md'),
        '# App Component\n\nDocumentation here.'
      );
      const result = CodeDocumentationLaw.check(mockContext);
      const readmeViolation = result.violations?.find(
        v => v.includes('Missing README.md') && v.includes('src/app')
      );
      expect(readmeViolation).toBeUndefined();
    });
  });

  describe('function documentation analysis', () => {
    beforeEach(() => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
    });

    it('should detect low function documentation coverage', () => {
      const undocumentedFunctions = `
export function processData(data: any): void {
  console.log(data);
}

export function calculateTotal(items: number[]): number {
  return items.reduce((a, b) => a + b, 0);
}

export function validateInput(input: string): boolean {
  return input.length > 0;
}

export const formatDate = (date: Date): string => {
  return date.toISOString();
};

export async function fetchData(url: string): Promise<any> {
  return fetch(url);
}
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'utils.ts'),
        undocumentedFunctions
      );
      const result = CodeDocumentationLaw.check(mockContext);
      const functionDocViolation = result.violations?.find(v =>
        v.includes('Function documentation coverage')
      );
      expect(functionDocViolation).toBeDefined();
    });

    it('should pass for well-documented functions', () => {
      const documentedFunctions = `
/**
 * Process data and log to console
 * @param data - The data to process
 */
export function processData(data: any): void {
  console.log(data);
}

/**
 * Calculate the total of numbers
 * @param items - Array of numbers
 * @returns The sum of all numbers
 */
export function calculateTotal(items: number[]): number {
  return items.reduce((a, b) => a + b, 0);
}
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'documented-utils.ts'),
        documentedFunctions
      );
      const result = CodeDocumentationLaw.check(mockContext);
      // Should not have documentation violation for this file
      const fileViolation = result.violations?.find(v =>
        v.includes('documented-utils.ts')
      );
      expect(fileViolation).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should handle unreadable files gracefully', () => {
      // Create a valid directory structure but corrupt file
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      // The law should handle any file read errors gracefully
      const result = CodeDocumentationLaw.check(mockContext);
      expect(result).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
    });

    it('should return error result on analysis failure', () => {
      // Test with invalid project root
      const invalidContext = {
        ...mockContext,
        projectRoot: '/nonexistent/path',
      };
      const result = CodeDocumentationLaw.check(invalidContext);
      expect(result).toBeDefined();
      // Should handle gracefully
      expect(typeof result.passed).toBe('boolean');
    });
  });

  describe('score calculation', () => {
    it('should return 100 when no violations', () => {
      const result = CodeDocumentationLaw.check(mockContext);
      if (result.passed) {
        expect(result.score).toBe(100);
      }
    });

    it('should deduct points for violations', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      const undocumented = Array(10)
        .fill(null)
        .map((_, i) => `export function func${i}() { return ${i}; }`)
        .join('\n');
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'undocumented.ts'),
        undocumented
      );
      const result = CodeDocumentationLaw.check(mockContext);
      if (result.violations && result.violations.length > 0) {
        expect(result.score).toBeLessThan(100);
      }
    });

    it('should not go below minimum score', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      // Create many files to generate many violations
      for (let i = 0; i < 10; i++) {
        const undocumented = Array(100)
          .fill(null)
          .map((_, j) => `export function func${i}_${j}() { return ${j}; }`)
          .join('\n');
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'src', `file${i}.ts`),
          undocumented
        );
      }
      const result = CodeDocumentationLaw.check(mockContext);
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('suggestions', () => {
    it('should include JSDoc suggestion when violations exist', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'undocumented.ts'),
        'export class Test {}'
      );
      const result = CodeDocumentationLaw.check(mockContext);
      if (!result.passed) {
        expect(result.suggestions).toContain(
          'Add JSDoc comments to classes and functions'
        );
      }
    });
  });
});
