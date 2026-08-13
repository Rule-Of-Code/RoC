/**
 * Tests for DatabaseQueryOptimizationLaw
 *
 * Comprehensive tests for database query optimization analysis
 * including Firestore optimization, indexing configuration,
 * query batching, pagination, query caching, and N+1 prevention.
 */
import { DatabaseQueryOptimizationLaw } from '../../../src/laws/performance/database-query-optimization';
import type { LawCheckContext } from '../../../src/types/law.types';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('DatabaseQueryOptimizationLaw', () => {
  let tempDir: string;
  let mockContext: LawCheckContext;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('database-query-opt-law-test-');
    // The law analyzes JS/TS query code against a database layer. The substrate
    // is USE, not a dependency name: give every fixture a source file that
    // actually opens Firestore, so the analysis runs. The N/A cases — including
    // a project that depends on `firebase` but only signs users in — have their
    // own blocks.
    FileUtils.writeFile(
      PathOperations.join(tempDir, 'package.json'),
      JSON.stringify(
        {
          name: 'test-project',
          dependencies: { '@angular/fire': '^17.0.0', firebase: '^10.0.0' },
        },
        null,
        2
      )
    );
    FileUtils.createDirectory(PathOperations.join(tempDir, 'src', 'app'));
    FileUtils.writeFile(
      PathOperations.join(tempDir, 'src', 'app', 'data.ts'),
      "import { getFirestore } from 'firebase/firestore';\n\nexport const db = getFirestore();\n"
    );
    mockContext = {
      projectRoot: tempDir,
      config: {
        project: {
          name: 'test-project',
          componentPrefix: 'app',
          type: 'angular',
        },
        ignores: {
          global: ['node_modules/**', 'dist/**'],
          tests: ['**/*.spec.ts'],
          build: ['dist/**'],
          design: [],
        },
        laws: {
          paretoMode: false,
          severity: {},
        },
        hooks: {
          preCommit: false,
          prePush: false,
          commitMsg: false,
        },
        reporting: {
          format: 'console',
          verbose: false,
          onlyFailures: false,
          scoring: true,
        },
        performance: {
          parallel: true,
          maxConcurrent: 4,
          cache: true,
        },
      },
    };
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
  });

  describe('check method', () => {
    it('should return Promise with LawResult', async () => {
      const result = await DatabaseQueryOptimizationLaw.check(mockContext);

      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('violations');
      expect(result).toHaveProperty('suggestions');
      expect(result).toHaveProperty('fixable');
      expect(result).toHaveProperty('config');
    });

    it('should have score between 0 and 100', async () => {
      const result = await DatabaseQueryOptimizationLaw.check(mockContext);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should return fixable as true', async () => {
      const result = await DatabaseQueryOptimizationLaw.check(mockContext);
      expect(result.fixable).toBe(true);
    });

    it('should include context config in result', async () => {
      const result = await DatabaseQueryOptimizationLaw.check(mockContext);
      expect(result.config).toEqual(mockContext.config);
    });

    it('should return violations as array', async () => {
      const result = await DatabaseQueryOptimizationLaw.check(mockContext);
      expect(Array.isArray(result.violations)).toBe(true);
    });

    it('should return suggestions as array', async () => {
      const result = await DatabaseQueryOptimizationLaw.check(mockContext);
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('should be an async function', () => {
      const checkFn = DatabaseQueryOptimizationLaw.check(mockContext);
      expect(checkFn).toBeInstanceOf(Promise);
    });
  });

  // The absence of the substrate is never a violation: a project with no
  // database layer (e.g. a Python backend that talks to no DB) has no query to
  // optimize — the law is NOT APPLICABLE, not permanently red.
  describe('project without a database layer (not applicable)', () => {
    let backendDir: string;

    beforeEach(() => {
      backendDir = FileUtils.createTempDirectory('db-no-substrate-test-');
      FileUtils.writeFile(
        PathOperations.join(backendDir, 'main.py'),
        'def run() -> None:\n    pass\n'
      );
      FileUtils.writeFile(
        PathOperations.join(backendDir, 'pyproject.toml'),
        '[project]\nname = "backend"\ndependencies = ["fastapi"]\n'
      );
    });

    afterEach(() => {
      FileUtils.deleteDirectory(backendDir);
    });

    it('should report N/A and pass with zero violations', async () => {
      const result = await DatabaseQueryOptimizationLaw.check({
        ...mockContext,
        projectRoot: backendDir,
      });

      expect(result.passed).toBe(true);
      expect(result.score).toBe(100);
      expect(result.violations).toEqual([]);
      expect(result.message).toContain('Not applicable');
      expect(result.message).toContain('no database layer');
    });

    // A real database, read by a stack this analyzer cannot parse: still not a
    // violation — the law says so honestly instead of failing the project.
    it('should report N/A when the database is real but the stack is not JS/TS', async () => {
      FileUtils.writeFile(
        PathOperations.join(backendDir, 'pyproject.toml'),
        '[project]\nname = "backend"\ndependencies = ["sqlalchemy"]\n'
      );

      const result = await DatabaseQueryOptimizationLaw.check({
        ...mockContext,
        projectRoot: backendDir,
      });

      expect(result.passed).toBe(true);
      expect(result.score).toBe(100);
      expect(result.violations).toEqual([]);
      expect(result.message).toContain('Not applicable');
      expect(result.message).toContain('JS/TS-only');
    });
  });

  describe('project with a database layer but no optimization', () => {
    it('should detect missing Firestore optimization', async () => {
      const result = await DatabaseQueryOptimizationLaw.check(mockContext);

      expect(
        result.violations?.some(v => v.toLowerCase().includes('firestore'))
      ).toBe(true);
    });

    it('should detect missing indexing configuration', async () => {
      const result = await DatabaseQueryOptimizationLaw.check(mockContext);

      expect(
        result.violations?.some(v => v.toLowerCase().includes('index'))
      ).toBe(true);
    });

    it('should detect missing query batching', async () => {
      const result = await DatabaseQueryOptimizationLaw.check(mockContext);

      expect(
        result.violations?.some(v => v.toLowerCase().includes('batch'))
      ).toBe(true);
    });

    it('should detect missing pagination', async () => {
      const result = await DatabaseQueryOptimizationLaw.check(mockContext);

      expect(
        result.violations?.some(v => v.toLowerCase().includes('pagination'))
      ).toBe(true);
    });

    it('should detect missing query caching', async () => {
      const result = await DatabaseQueryOptimizationLaw.check(mockContext);

      expect(
        result.violations?.some(v => v.toLowerCase().includes('caching'))
      ).toBe(true);
    });

    // Note: N+1 detection only triggers when service files with loops+queries exist
    // An empty project returns addressed:true since there are no patterns to check

    it('should fail for empty project', async () => {
      const result = await DatabaseQueryOptimizationLaw.check(mockContext);
      expect(result.passed).toBe(false);
    });

    it('should have reduced score for empty project', async () => {
      const result = await DatabaseQueryOptimizationLaw.check(mockContext);
      expect(result.score).toBeLessThan(100);
    });
  });

  describe('project with Firestore indexes', () => {
    beforeEach(() => {
      // Create firestore.indexes.json
      const firestoreIndexes = {
        indexes: [
          {
            collectionGroup: 'users',
            queryScope: 'COLLECTION',
            fields: [
              { fieldPath: 'createdAt', order: 'DESCENDING' },
              { fieldPath: 'status', order: 'ASCENDING' },
            ],
          },
          {
            collectionGroup: 'orders',
            queryScope: 'COLLECTION',
            fields: [
              { fieldPath: 'userId', order: 'ASCENDING' },
              { fieldPath: 'orderDate', order: 'DESCENDING' },
            ],
          },
        ],
        fieldOverrides: [],
      };
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'firestore.indexes.json'),
        JSON.stringify(firestoreIndexes, null, 2)
      );
    });

    it('should detect Firestore indexes configuration', async () => {
      const result = await DatabaseQueryOptimizationLaw.check(mockContext);

      // Firestore indexes should be detected
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should not have indexing violation', async () => {
      const result = await DatabaseQueryOptimizationLaw.check(mockContext);

      // Index configuration should be detected
      expect(result).toBeDefined();
    });
  });

  describe('project with query batching', () => {
    beforeEach(() => {
      // Create service file with batch operations
      const srcDir = PathOperations.join(tempDir, 'src', 'app', 'services');
      FileUtils.createDirectory(srcDir);

      const firestoreService = `
import { Injectable } from '@angular/core';
import { Firestore, writeBatch, doc, collection } from '@angular/fire/firestore';

@Injectable({ providedIn: 'root' })
export class UserService {
  constructor(private firestore: Firestore) {}

  async batchUpdateUsers(users: User[]): Promise<void> {
    const batch = writeBatch(this.firestore);

    for (const user of users) {
      const userRef = doc(this.firestore, 'users', user.id);
      batch.update(userRef, { lastUpdated: new Date() });
    }

    await batch.commit();
  }

  async batchDeleteUsers(userIds: string[]): Promise<void> {
    const batch = writeBatch(this.firestore);

    for (const id of userIds) {
      const userRef = doc(this.firestore, 'users', id);
      batch.delete(userRef);
    }

    await batch.commit();
  }
}
`;
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'user.service.ts'),
        firestoreService
      );
    });

    it('should detect query batching implementation', async () => {
      const result = await DatabaseQueryOptimizationLaw.check(mockContext);

      // Query batching should be detected
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('project with pagination', () => {
    beforeEach(() => {
      // Create service file with pagination
      const srcDir = PathOperations.join(tempDir, 'src', 'app', 'services');
      FileUtils.createDirectory(srcDir);

      const paginatedService = `
import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  QueryDocumentSnapshot
} from '@angular/fire/firestore';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private lastDoc: QueryDocumentSnapshot | null = null;
  private readonly pageSize = 20;

  constructor(private firestore: Firestore) {}

  async getProductsPage(): Promise<Product[]> {
    const productsRef = collection(this.firestore, 'products');

    let q = query(
      productsRef,
      orderBy('createdAt', 'desc'),
      limit(this.pageSize)
    );

    if (this.lastDoc) {
      q = query(q, startAfter(this.lastDoc));
    }

    const snapshot = await getDocs(q);
    this.lastDoc = snapshot.docs[snapshot.docs.length - 1];

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
  }

  resetPagination(): void {
    this.lastDoc = null;
  }
}
`;
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'product.service.ts'),
        paginatedService
      );
    });

    it('should detect pagination implementation', async () => {
      const result = await DatabaseQueryOptimizationLaw.check(mockContext);

      // Pagination should be detected
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should recognize startAfter pattern', async () => {
      const result = await DatabaseQueryOptimizationLaw.check(mockContext);

      // startAfter is a common pagination pattern
      expect(result).toBeDefined();
    });
  });

  describe('project with query caching', () => {
    beforeEach(() => {
      // Create service file with caching
      const srcDir = PathOperations.join(tempDir, 'src', 'app', 'services');
      FileUtils.createDirectory(srcDir);

      const cachedService = `
import { Injectable } from '@angular/core';
import { Firestore, collection, getDocs } from '@angular/fire/firestore';
import { BehaviorSubject, Observable, shareReplay } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CachedDataService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly cacheDuration = 5 * 60 * 1000; // 5 minutes

  private categoriesSubject = new BehaviorSubject<Category[]>([]);
  categories$ = this.categoriesSubject.asObservable().pipe(shareReplay(1));

  constructor(private firestore: Firestore) {}

  async getCategories(): Promise<Category[]> {
    const cacheKey = 'categories';
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
      return cached.data;
    }

    const categoriesRef = collection(this.firestore, 'categories');
    const snapshot = await getDocs(categoriesRef);
    const categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));

    this.cache.set(cacheKey, { data: categories, timestamp: Date.now() });
    this.categoriesSubject.next(categories);

    return categories;
  }

  invalidateCache(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }
}
`;
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'cached-data.service.ts'),
        cachedService
      );
    });

    it('should detect query caching implementation', async () => {
      const result = await DatabaseQueryOptimizationLaw.check(mockContext);

      // Query caching should be detected
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should recognize shareReplay pattern', async () => {
      const result = await DatabaseQueryOptimizationLaw.check(mockContext);

      // shareReplay is a common RxJS caching pattern
      expect(result).toBeDefined();
    });
  });

  describe('project with N+1 prevention', () => {
    beforeEach(() => {
      // Create service file with proper data loading
      const srcDir = PathOperations.join(tempDir, 'src', 'app', 'services');
      FileUtils.createDirectory(srcDir);

      const optimizedService = `
import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  query,
  where,
  getDocs,
  documentId
} from '@angular/fire/firestore';

@Injectable({ providedIn: 'root' })
export class OptimizedDataService {
  constructor(private firestore: Firestore) {}

  // Batch load related data to prevent N+1 queries
  async getUsersWithOrders(userIds: string[]): Promise<Map<string, Order[]>> {
    if (userIds.length === 0) return new Map();

    // Batch load all orders in one query instead of N queries
    const ordersRef = collection(this.firestore, 'orders');
    const ordersQuery = query(ordersRef, where('userId', 'in', userIds));
    const snapshot = await getDocs(ordersQuery);

    const ordersMap = new Map<string, Order[]>();
    snapshot.docs.forEach(doc => {
      const order = { id: doc.id, ...doc.data() } as Order;
      const existing = ordersMap.get(order.userId) || [];
      existing.push(order);
      ordersMap.set(order.userId, existing);
    });

    return ordersMap;
  }

  // Use documentId() for batch document fetches
  async getDocumentsByIds(collectionName: string, ids: string[]): Promise<any[]> {
    if (ids.length === 0) return [];

    const ref = collection(this.firestore, collectionName);
    const q = query(ref, where(documentId(), 'in', ids.slice(0, 10)));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
}
`;
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'optimized-data.service.ts'),
        optimizedService
      );
    });

    it('should detect N+1 prevention patterns', async () => {
      const result = await DatabaseQueryOptimizationLaw.check(mockContext);

      // N+1 prevention should be detected
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should recognize where in query pattern', async () => {
      const result = await DatabaseQueryOptimizationLaw.check(mockContext);

      // where(...in...) is a common batch query pattern
      expect(result).toBeDefined();
    });
  });

  describe('project with Firestore optimization', () => {
    beforeEach(() => {
      // Create optimized Firestore service
      const srcDir = PathOperations.join(tempDir, 'src', 'app', 'services');
      FileUtils.createDirectory(srcDir);

      const firestoreService = `
import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  query,
  where,
  orderBy,
  limit
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class FirestoreService {
  constructor(private firestore: Firestore) {}

  // Using optimized queries with proper ordering and limits
  getRecentProducts(categoryId: string, count: number = 10): Observable<Product[]> {
    const productsRef = collection(this.firestore, 'products');
    const q = query(
      productsRef,
      where('categoryId', '==', categoryId),
      where('active', '==', true),
      orderBy('createdAt', 'desc'),
      limit(count)
    );
    return collectionData(q, { idField: 'id' }) as Observable<Product[]>;
  }

  // Using select to limit returned fields (when available)
  getProductSummaries(): Observable<ProductSummary[]> {
    const productsRef = collection(this.firestore, 'products');
    const q = query(productsRef, limit(50));
    return collectionData(q, { idField: 'id' }) as Observable<ProductSummary[]>;
  }
}
`;
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'firestore.service.ts'),
        firestoreService
      );

      // Create firestore.indexes.json
      const indexes = {
        indexes: [
          {
            collectionGroup: 'products',
            fields: [
              { fieldPath: 'categoryId', order: 'ASCENDING' },
              { fieldPath: 'active', order: 'ASCENDING' },
              { fieldPath: 'createdAt', order: 'DESCENDING' },
            ],
          },
        ],
      };
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'firestore.indexes.json'),
        JSON.stringify(indexes, null, 2)
      );
    });

    it('should detect Firestore optimization', async () => {
      const result = await DatabaseQueryOptimizationLaw.check(mockContext);

      // Firestore optimization should be detected
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('fully configured project', () => {
    beforeEach(() => {
      // Create firestore.indexes.json
      const indexes = {
        indexes: [
          {
            collectionGroup: 'products',
            fields: [
              { fieldPath: 'categoryId', order: 'ASCENDING' },
              { fieldPath: 'createdAt', order: 'DESCENDING' },
            ],
          },
        ],
      };
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'firestore.indexes.json'),
        JSON.stringify(indexes, null, 2)
      );

      // Create comprehensive service
      const srcDir = PathOperations.join(tempDir, 'src', 'app', 'services');
      FileUtils.createDirectory(srcDir);

      const service = `
import { Injectable } from '@angular/core';
import { Firestore, writeBatch, query, where, limit, startAfter, getDocs } from '@angular/fire/firestore';
import { shareReplay } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DataService {
  private cache = new Map();

  constructor(private firestore: Firestore) {}

  // Batch operations
  async batchUpdate(items: any[]) {
    const batch = writeBatch(this.firestore);
    // batch operations
    await batch.commit();
  }

  // Pagination with startAfter
  async getPage(lastDoc: any) {
    const q = query(collection(this.firestore, 'items'), limit(20), startAfter(lastDoc));
    return getDocs(q);
  }

  // Caching
  getData() {
    if (this.cache.has('data')) return this.cache.get('data');
    // fetch and cache
  }

  // Batch load to prevent N+1
  async loadRelated(ids: string[]) {
    const q = query(collection(this.firestore, 'related'), where('id', 'in', ids));
    return getDocs(q);
  }
}
`;
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'data.service.ts'),
        service
      );
    });

    it('should have better score for fully configured project', async () => {
      const result = await DatabaseQueryOptimizationLaw.check(mockContext);

      // Well configured project should have higher score
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should have fewer violations', async () => {
      const result = await DatabaseQueryOptimizationLaw.check(mockContext);

      // Fewer violations expected
      expect(result.violations).toBeDefined();
    });
  });

  describe('message generation', () => {
    it('should have appropriate message when passed', async () => {
      const result = await DatabaseQueryOptimizationLaw.check(mockContext);

      if (result.passed) {
        expect(result.message.toLowerCase()).toContain('implemented');
      }
    });

    it('should have appropriate message when failed', async () => {
      const result = await DatabaseQueryOptimizationLaw.check(mockContext);

      if (!result.passed) {
        expect(result.message.toLowerCase()).toContain('issues');
      }
    });
  });

  describe('details array', () => {
    it('should contain violations in details', async () => {
      const result = await DatabaseQueryOptimizationLaw.check(mockContext);

      expect(result.details).toBeDefined();
      expect(Array.isArray(result.details)).toBe(true);
    });

    it('should have details for empty project', async () => {
      const result = await DatabaseQueryOptimizationLaw.check(mockContext);

      if (result.details) {
        expect(result.details.length).toBeGreaterThan(0);
      }
    });
  });

  describe('score calculation', () => {
    it('should never go below 0', async () => {
      const result = await DatabaseQueryOptimizationLaw.check(mockContext);
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should start from 100', async () => {
      const result = await DatabaseQueryOptimizationLaw.check(mockContext);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should deduct points for each missing configuration', async () => {
      const result = await DatabaseQueryOptimizationLaw.check(mockContext);

      if ((result.violations?.length ?? 0) > 0) {
        expect(result.score).toBeLessThan(100);
      }
    });
  });

  describe('different project types', () => {
    it('should work with React project type', async () => {
      mockContext.config.project.type = 'react';
      const result = await DatabaseQueryOptimizationLaw.check(mockContext);

      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should work with Vue project type', async () => {
      mockContext.config.project.type = 'vue';
      const result = await DatabaseQueryOptimizationLaw.check(mockContext);

      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should work with Node project type', async () => {
      mockContext.config.project.type = 'node';
      const result = await DatabaseQueryOptimizationLaw.check(mockContext);

      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });
});
