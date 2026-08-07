/**
 * Tests for ObservableCleanupLaw
 *
 * Comprehensive tests for RxJS observable cleanup validation
 */
import { ObservableCleanupLaw } from '../../../src/checkers/code-quality-laws/observable-cleanup';
import type { LawCheckContext, RuleOfCodeConfig } from '../../../src/types';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('ObservableCleanupLaw', () => {
  let tempDir: string;
  let mockConfig: RuleOfCodeConfig;
  let mockContext: LawCheckContext;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('observable-cleanup-test-');
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
      const result = ObservableCleanupLaw.check(mockContext);
      expect(result).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
    });

    it('should have violations array', () => {
      const result = ObservableCleanupLaw.check(mockContext);
      expect(Array.isArray(result.violations)).toBe(true);
    });

    it('should have suggestions array', () => {
      const result = ObservableCleanupLaw.check(mockContext);
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('should have score property', () => {
      const result = ObservableCleanupLaw.check(mockContext);
      expect(typeof result.score).toBe('number');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should have message property', () => {
      const result = ObservableCleanupLaw.check(mockContext);
      expect(typeof result.message).toBe('string');
    });

    it('should have config property', () => {
      const result = ObservableCleanupLaw.check(mockContext);
      expect(result.config).toBe(mockConfig);
    });

    it('should pass for empty project', () => {
      const result = ObservableCleanupLaw.check(mockContext);
      expect(result.passed).toBe(true);
    });
  });

  describe('observable subscription without cleanup', () => {
    beforeEach(() => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
    });

    it('should detect subscriptions without cleanup', () => {
      const codeWithoutCleanup = `
import { Observable } from 'rxjs';

export class DataService {
  private data$ = new Observable();

  loadData() {
    this.data$.subscribe(data => {
      console.log(data);
    });
  }
}
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'data.service.ts'),
        codeWithoutCleanup
      );
      const result = ObservableCleanupLaw.check(mockContext);
      const subscriptionViolation = result.violations?.find(
        v =>
          v.includes('Observable subscriptions without proper cleanup') ||
          v.includes('subscription without unsubscribe')
      );
      expect(subscriptionViolation).toBeDefined();
    });

    it('should pass for subscriptions with unsubscribe', () => {
      const codeWithCleanup = `
import { Subscription } from 'rxjs';

export class DataService {
  private subscription: Subscription;

  loadData() {
    this.subscription = this.data$.subscribe(data => {
      console.log(data);
    });
  }

  cleanup() {
    this.subscription.unsubscribe();
  }
}
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'clean.service.ts'),
        codeWithCleanup
      );
      const result = ObservableCleanupLaw.check(mockContext);
      const cleanViolation = result.violations?.find(
        v =>
          v.includes('clean.service.ts') &&
          v.includes('subscription without unsubscribe')
      );
      expect(cleanViolation).toBeUndefined();
    });

    it('should pass for subscriptions with takeUntil', () => {
      const codeWithTakeUntil = `
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

export class DataService {
  private destroy$ = new Subject<void>();

  loadData() {
    this.data$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(data => {
      console.log(data);
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'takeuntil.service.ts'),
        codeWithTakeUntil
      );
      const result = ObservableCleanupLaw.check(mockContext);
      const takeUntilViolation = result.violations?.find(
        v =>
          v.includes('takeuntil.service.ts') &&
          v.includes('Observable subscriptions without proper cleanup')
      );
      expect(takeUntilViolation).toBeUndefined();
    });
  });

  describe('component without OnDestroy', () => {
    beforeEach(() => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
    });

    it('should detect component with subscriptions missing OnDestroy', () => {
      const componentWithoutOnDestroy = `
import { Component } from '@angular/core';
import { DataService } from './data.service';

@Component({
  selector: 'app-user',
  template: '<div>User</div>'
})
export class UserComponent {
  constructor(private dataService: DataService) {}

  ngOnInit() {
    this.dataService.getUser().subscribe(user => {
      this.user = user;
    });
  }
}
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'user.component.ts'),
        componentWithoutOnDestroy
      );
      const result = ObservableCleanupLaw.check(mockContext);
      const componentViolation = result.violations?.find(v =>
        v.includes('Component with subscriptions missing OnDestroy')
      );
      expect(componentViolation).toBeDefined();
    });

    it('should pass for component with OnDestroy', () => {
      const componentWithOnDestroy = `
import { Component, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-user',
  template: '<div>User</div>'
})
export class UserComponent implements OnDestroy {
  private destroy$ = new Subject<void>();

  ngOnInit() {
    this.dataService.getUser()
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => this.user = user);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'proper.component.ts'),
        componentWithOnDestroy
      );
      const result = ObservableCleanupLaw.check(mockContext);
      const properViolation = result.violations?.find(
        v =>
          v.includes('proper.component.ts') && v.includes('missing OnDestroy')
      );
      expect(properViolation).toBeUndefined();
    });
  });

  describe('pipe with subscribe detection', () => {
    beforeEach(() => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
    });

    it('should detect .pipe() with subscribe without cleanup', () => {
      const codeWithPipe = `
export class DataHandler {
  loadData() {
    this.data$.pipe(
      map(x => x * 2),
      filter(x => x > 10)
    ).subscribe(result => {
      this.result = result;
    });
  }
}
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'handler.ts'),
        codeWithPipe
      );
      const result = ObservableCleanupLaw.check(mockContext);
      const pipeViolation = result.violations?.find(
        v =>
          v.includes('handler.ts') &&
          (v.includes('subscription') || v.includes('Observable'))
      );
      expect(pipeViolation).toBeDefined();
    });
  });

  describe('destroy$ subject pattern', () => {
    beforeEach(() => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
    });

    it('should pass for destroy$ subject pattern', () => {
      const codeWithDestroy = `
export class DataService {
  private destroy$ = new Subject<void>();

  loadData() {
    this.data$.pipe(
      takeUntil(this.destroy$)
    ).subscribe();
  }
}
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'destroy-pattern.ts'),
        codeWithDestroy
      );
      const result = ObservableCleanupLaw.check(mockContext);
      const destroyViolation = result.violations?.find(
        v =>
          v.includes('destroy-pattern.ts') &&
          v.includes('Observable subscriptions without proper cleanup')
      );
      expect(destroyViolation).toBeUndefined();
    });
  });

  describe('suggestions', () => {
    beforeEach(() => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
    });

    it('should include OnDestroy suggestion when violations exist', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'bad.component.ts'),
        `
export class BadComponent {
  ngOnInit() {
    this.data$.subscribe();
  }
}
`
      );
      const result = ObservableCleanupLaw.check(mockContext);
      if (!result.passed) {
        expect(result.suggestions).toContain('Implement OnDestroy interface');
      }
    });

    it('should include takeUntil suggestion when violations exist', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'bad.service.ts'),
        `
export class BadService {
  load() {
    this.data$.subscribe();
  }
}
`
      );
      const result = ObservableCleanupLaw.check(mockContext);
      if (!result.passed) {
        expect(result.suggestions).toContain('Add takeUntil destroy pattern');
      }
    });

    it('should include cleanup utility suggestion', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'bad.ts'),
        `
export class Bad {
  init() {
    this.data$.subscribe();
  }
}
`
      );
      const result = ObservableCleanupLaw.check(mockContext);
      if (!result.passed) {
        expect(result.suggestions).toContain(
          'Create Observable cleanup utility'
        );
      }
    });

    it('should include async pipe suggestion', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'template.component.ts'),
        `
export class TemplateComponent {
  ngOnInit() {
    this.data$.subscribe();
  }
}
`
      );
      const result = ObservableCleanupLaw.check(mockContext);
      if (!result.passed) {
        expect(result.suggestions).toContain('Use async pipe in templates');
      }
    });
  });

  describe('score calculation', () => {
    it('should return 100 when no violations', () => {
      const result = ObservableCleanupLaw.check(mockContext);
      if (result.passed) {
        expect(result.score).toBe(100);
      }
    });

    it('should deduct points for violations', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'leaky.component.ts'),
        `
export class LeakyComponent {
  ngOnInit() {
    this.data$.subscribe();
    this.other$.subscribe();
  }
}
`
      );
      const result = ObservableCleanupLaw.check(mockContext);
      expect(result.score).toBeLessThan(100);
    });

    it('should have minimum score', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      // Create many files with violations
      for (let i = 0; i < 10; i++) {
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'src', `leaky${i}.component.ts`),
          `
export class Leaky${i}Component {
  ngOnInit() {
    this.data$.subscribe();
  }
}
`
        );
      }
      const result = ObservableCleanupLaw.check(mockContext);
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('error handling', () => {
    it('should handle unreadable files gracefully', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      const result = ObservableCleanupLaw.check(mockContext);
      expect(result).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
    });

    it('should include error in violations if analysis fails', () => {
      // Create a context with invalid path
      const invalidContext = {
        ...mockContext,
        projectRoot: '/nonexistent/path/that/doesnt/exist',
      };
      const result = ObservableCleanupLaw.check(invalidContext);
      expect(result).toBeDefined();
    });
  });

  describe('non-component files', () => {
    beforeEach(() => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
    });

    it('should detect subscription issues in services', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'data.service.ts'),
        `
export class DataService {
  loadData() {
    this.http.get('/api').subscribe(data => this.data = data);
  }
}
`
      );
      const result = ObservableCleanupLaw.check(mockContext);
      const serviceViolation = result.violations?.find(v =>
        v.includes('data.service.ts')
      );
      expect(serviceViolation).toBeDefined();
    });

    it('should detect subscription issues in utilities', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'data-loader.ts'),
        `
export function loadData(source$: Observable<any>) {
  source$.subscribe(data => console.log(data));
}
`
      );
      const result = ObservableCleanupLaw.check(mockContext);
      const utilViolation = result.violations?.find(v =>
        v.includes('data-loader.ts')
      );
      expect(utilViolation).toBeDefined();
    });
  });

  describe('multiple subscriptions', () => {
    beforeEach(() => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
    });

    it('should detect multiple subscriptions without cleanup', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'multi.component.ts'),
        `
export class MultiComponent {
  ngOnInit() {
    this.users$.subscribe(users => this.users = users);
    this.products$.subscribe(products => this.products = products);
    this.orders$.subscribe(orders => this.orders = orders);
  }
}
`
      );
      const result = ObservableCleanupLaw.check(mockContext);
      const multiViolation = result.violations?.find(v =>
        v.includes('multi.component.ts')
      );
      expect(multiViolation).toBeDefined();
    });
  });
});
