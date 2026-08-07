/**
 * Observable Cleanup Utilities - Tests
 * Tests for ObservableCleanupBase, ObservableUtils, and ObservableCleanup classes
 */
import { Subject } from 'rxjs';
import {
  AutoCleanup,
  ObservableCleanup,
  ObservableCleanupBase,
  ObservableUtils,
} from '../../src/utils/observable-cleanup';

// Test class that extends ObservableCleanupBase
class TestComponent extends ObservableCleanupBase {
  // Expose protected methods for testing
  public testCleanup(): void {
    this.cleanup();
  }

  public testGetDestroySubject(): Subject<void> {
    return this.getDestroySubject();
  }
}

describe('ObservableCleanupBase', () => {
  let component: TestComponent;

  beforeEach(() => {
    component = new TestComponent();
  });

  describe('destroy$ subject', () => {
    it('should have a destroy$ subject', () => {
      const destroy$ = component.testGetDestroySubject();
      expect(destroy$).toBeInstanceOf(Subject);
    });
  });

  describe('cleanup()', () => {
    it('should complete the destroy$ subject', () => {
      const destroy$ = component.testGetDestroySubject();
      let completed = false;
      destroy$.subscribe({
        complete: () => {
          completed = true;
        },
      });

      component.testCleanup();
      expect(completed).toBe(true);
    });

    it('should emit next before completing', () => {
      const destroy$ = component.testGetDestroySubject();
      let nextCalled = false;
      destroy$.subscribe({
        next: () => {
          nextCalled = true;
        },
      });

      component.testCleanup();
      expect(nextCalled).toBe(true);
    });
  });

  describe('getDestroySubject()', () => {
    it('should return the same subject instance', () => {
      const subject1 = component.testGetDestroySubject();
      const subject2 = component.testGetDestroySubject();
      expect(subject1).toBe(subject2);
    });
  });
});

describe('ObservableUtils', () => {
  describe('createDestroySubject()', () => {
    it('should create a new Subject', () => {
      const subject = ObservableUtils.createDestroySubject();
      expect(subject).toBeInstanceOf(Subject);
    });

    it('should create a new instance each time', () => {
      const subject1 = ObservableUtils.createDestroySubject();
      const subject2 = ObservableUtils.createDestroySubject();
      expect(subject1).not.toBe(subject2);
    });
  });

  describe('cleanup()', () => {
    it('should complete the subject', () => {
      const subject = new Subject<void>();
      let completed = false;
      subject.subscribe({
        complete: () => {
          completed = true;
        },
      });

      ObservableUtils.cleanup(subject);
      expect(completed).toBe(true);
    });

    it('should emit next before completing', () => {
      const subject = new Subject<void>();
      let nextCalled = false;
      subject.subscribe({
        next: () => {
          nextCalled = true;
        },
      });

      ObservableUtils.cleanup(subject);
      expect(nextCalled).toBe(true);
    });
  });
});

describe('ObservableCleanup', () => {
  describe('detectCleanupPatterns()', () => {
    it('should detect unsubscribe pattern', () => {
      const content = 'this.subscription.unsubscribe();';
      const patterns = ObservableCleanup.detectCleanupPatterns(content);
      expect(patterns).toContain('Subscription cleanup');
    });

    it('should detect clearInterval pattern', () => {
      const content = 'clearInterval(this.intervalId);';
      const patterns = ObservableCleanup.detectCleanupPatterns(content);
      expect(patterns).toContain('Interval cleanup');
    });

    it('should detect clearTimeout pattern', () => {
      const content = 'clearTimeout(this.timeoutId);';
      const patterns = ObservableCleanup.detectCleanupPatterns(content);
      expect(patterns).toContain('Timeout cleanup');
    });

    it('should detect removeEventListener pattern', () => {
      const content = "window.removeEventListener('resize', handler);";
      const patterns = ObservableCleanup.detectCleanupPatterns(content);
      expect(patterns).toContain('Event listener cleanup');
    });

    it('should detect reference nullification pattern', () => {
      const content = 'this.reference = null;';
      const patterns = ObservableCleanup.detectCleanupPatterns(content);
      expect(patterns).toContain('Reference nullification');
    });

    it('should detect multiple patterns', () => {
      const content = `
        this.subscription.unsubscribe();
        clearInterval(this.intervalId);
        this.reference = null;
      `;
      const patterns = ObservableCleanup.detectCleanupPatterns(content);
      expect(patterns).toHaveLength(3);
      expect(patterns).toContain('Subscription cleanup');
      expect(patterns).toContain('Interval cleanup');
      expect(patterns).toContain('Reference nullification');
    });

    it('should return empty array for content without cleanup patterns', () => {
      const content = 'const x = 1;';
      const patterns = ObservableCleanup.detectCleanupPatterns(content);
      expect(patterns).toHaveLength(0);
    });
  });

  describe('hasUnsubscribePattern()', () => {
    it('should return true for .unsubscribe()', () => {
      const content = 'this.subscription.unsubscribe();';
      expect(ObservableCleanup.hasUnsubscribePattern(content)).toBe(true);
    });

    it('should return true for takeUntil(', () => {
      const content = 'this.data$.pipe(takeUntil(this.destroy$));';
      expect(ObservableCleanup.hasUnsubscribePattern(content)).toBe(true);
    });

    it('should return true for takeWhile(', () => {
      const content = 'this.data$.pipe(takeWhile(() => this.alive));';
      expect(ObservableCleanup.hasUnsubscribePattern(content)).toBe(true);
    });

    it('should return true for ngOnDestroy', () => {
      const content = 'ngOnDestroy() { this.cleanup(); }';
      expect(ObservableCleanup.hasUnsubscribePattern(content)).toBe(true);
    });

    it('should return false for content without cleanup patterns', () => {
      const content = 'this.data$.subscribe();';
      expect(ObservableCleanup.hasUnsubscribePattern(content)).toBe(false);
    });
  });
});

describe('AutoCleanup decorator', () => {
  it('should be a function', () => {
    expect(typeof AutoCleanup).toBe('function');
  });

  it('should return a decorator function', () => {
    const decorator = AutoCleanup();
    expect(typeof decorator).toBe('function');
  });

  it('should create a class with destroy$ when applied', () => {
    // Testing the decorator functionality without using decorator syntax
    // to avoid TypeScript strict type checking issues
    const decorator = AutoCleanup();
    class BaseClass {
      [key: string]: unknown;
    }
    const DecoratedClass = decorator(BaseClass);
    const instance = new DecoratedClass() as { destroy$: Subject<void> };
    expect(instance.destroy$).toBeInstanceOf(Subject);
  });

  it('should create a class with ngOnDestroy when applied', () => {
    const decorator = AutoCleanup();
    class BaseClass {
      [key: string]: unknown;
    }
    const DecoratedClass = decorator(BaseClass);
    const instance = new DecoratedClass() as {
      destroy$: Subject<void>;
      ngOnDestroy: () => void;
    };
    expect(typeof instance.ngOnDestroy).toBe('function');
  });

  it('should complete destroy$ when ngOnDestroy is called', () => {
    const decorator = AutoCleanup();
    class BaseClass {
      [key: string]: unknown;
    }
    const DecoratedClass = decorator(BaseClass);
    const instance = new DecoratedClass() as {
      destroy$: Subject<void>;
      ngOnDestroy: () => void;
    };

    let completed = false;
    instance.destroy$.subscribe({
      complete: () => {
        completed = true;
      },
    });

    instance.ngOnDestroy();
    expect(completed).toBe(true);
  });
});
