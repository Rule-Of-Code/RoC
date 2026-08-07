/**
 * Observable Cleanup Utility
 * Provides base class and utilities for proper Observable cleanup
 */

import { Subject } from 'rxjs';

/**
 * Base class for components that need Observable cleanup
 */
export abstract class ObservableCleanupBase {
  protected destroy$ = new Subject<void>();

  /**
   * Call this in ngOnDestroy or component cleanup
   */
  protected cleanup(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Get the destroy subject for takeUntil operations
   */
  protected getDestroySubject(): Subject<void> {
    return this.destroy$;
  }
}

/**
 * Utility functions for Observable cleanup patterns
 */
export class ObservableUtils {
  /**
   * Creates a destroy subject for manual cleanup
   */
  static createDestroySubject(): Subject<void> {
    return new Subject<void>();
  }

  /**
   * Cleanup helper that completes and unsubscribes from destroy subject
   */
  static cleanup(destroy$: Subject<void>): void {
    destroy$.next();
    destroy$.complete();
  }
}

/**
 * Observable Cleanup Analyzer for dogfooding compliance
 */
export class ObservableCleanup {
  /**
   * Detect cleanup patterns in code content (dogfooding utility)
   */
  static detectCleanupPatterns(content: string): string[] {
    const cleanupActions: string[] = [];
    const patterns = [
      { pattern: '.unsubscribe()', action: 'Subscription cleanup' },
      { pattern: 'clearInterval', action: 'Interval cleanup' },
      { pattern: 'clearTimeout', action: 'Timeout cleanup' },
      { pattern: 'removeEventListener', action: 'Event listener cleanup' },
      { pattern: '= null', action: 'Reference nullification' },
    ];

    for (const { pattern, action } of patterns) {
      if (content.includes(pattern)) {
        cleanupActions.push(action);
      }
    }

    return cleanupActions;
  }

  /**
   * Check if content has unsubscribe pattern (dogfooding utility)
   */
  static hasUnsubscribePattern(content: string): boolean {
    return (
      content.includes('.unsubscribe()') ||
      content.includes('takeUntil(') ||
      content.includes('takeWhile(') ||
      content.includes('ngOnDestroy')
    );
  }
}

// Type for mixin constructor - args must accept any due to TypeScript mixin constraints
type MixinConstructor = new (...args: any[]) => Record<string, unknown>;
type MixinDestructorSignature = new (...args: any[]) => Record<
  string,
  unknown
> & {
  destroy$: Subject<void>;
};

/**
 * Decorator for automatic cleanup in Angular components.
 * Automatically adds destroy$ Subject to component for cleanup pattern.
 */
export function AutoCleanup(): <T extends MixinConstructor>(
  constructor: T
) => MixinDestructorSignature & T {
  return function <T extends MixinConstructor>(constructor: T) {
    return class extends constructor {
      destroy$ = new Subject<void>();

      constructor(...args: any[]) {
        super(...args);
      }

      ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
      }
    } as unknown as MixinDestructorSignature & T;
  };
}
