/**
 * @fileoverview Tests for memory.types.ts
 * @description Tests for memory management type interfaces
 */

import {
  ComponentMemoryProfile,
  MemoryAnalysisResult,
  MemoryLeakPatterns,
  MemoryPractices,
} from '../../src/utils/types/memory.types';

describe('utils/types/memory.types', () => {
  describe('MemoryLeakPatterns interface', () => {
    it('should support all pattern types', () => {
      const patterns: MemoryLeakPatterns = {
        unsubscribedObservables: ['observable1.ts:10'],
        missingOnDestroy: ['component.ts'],
        globalEventListeners: ['app.component.ts:25'],
        setIntervalWithoutClear: ['service.ts:100'],
        domReferences: ['directive.ts:50'],
        circularReferences: ['model.ts:20'],
      };

      expect(patterns.unsubscribedObservables).toHaveLength(1);
      expect(patterns.missingOnDestroy).toHaveLength(1);
      expect(patterns.globalEventListeners).toHaveLength(1);
      expect(patterns.setIntervalWithoutClear).toHaveLength(1);
      expect(patterns.domReferences).toHaveLength(1);
      expect(patterns.circularReferences).toHaveLength(1);
    });

    it('should support empty arrays', () => {
      const patterns: MemoryLeakPatterns = {
        unsubscribedObservables: [],
        missingOnDestroy: [],
        globalEventListeners: [],
        setIntervalWithoutClear: [],
        domReferences: [],
        circularReferences: [],
      };

      Object.values(patterns).forEach(arr => {
        expect(arr).toHaveLength(0);
      });
    });

    it('should support multiple issues per category', () => {
      const patterns: MemoryLeakPatterns = {
        unsubscribedObservables: ['file1.ts', 'file2.ts', 'file3.ts'],
        missingOnDestroy: [],
        globalEventListeners: [],
        setIntervalWithoutClear: [],
        domReferences: [],
        circularReferences: [],
      };

      expect(patterns.unsubscribedObservables).toHaveLength(3);
    });
  });

  describe('MemoryPractices interface', () => {
    it('should support all practice fields', () => {
      const practices: MemoryPractices = {
        largeDataStructures: ['cache.ts:50'],
        violations: ['Memory limit exceeded'],
        suggestions: ['Use pagination for large data'],
      };

      expect(practices.largeDataStructures).toHaveLength(1);
      expect(practices.violations).toHaveLength(1);
      expect(practices.suggestions).toHaveLength(1);
    });

    it('should support empty practices', () => {
      const practices: MemoryPractices = {
        largeDataStructures: [],
        violations: [],
        suggestions: [],
      };

      expect(Object.values(practices).every(arr => arr.length === 0)).toBe(
        true
      );
    });
  });

  describe('MemoryAnalysisResult interface', () => {
    it('should combine patterns, practices and recommendations', () => {
      const result: MemoryAnalysisResult = {
        patterns: {
          unsubscribedObservables: [],
          missingOnDestroy: ['component.ts'],
          globalEventListeners: [],
          setIntervalWithoutClear: [],
          domReferences: [],
          circularReferences: [],
        },
        practices: {
          largeDataStructures: [],
          violations: [],
          suggestions: ['Add OnDestroy lifecycle hook'],
        },
        recommendations: ['Implement proper cleanup'],
        totalIssues: 1,
      };

      expect(result.patterns.missingOnDestroy).toHaveLength(1);
      expect(result.practices.suggestions).toHaveLength(1);
      expect(result.recommendations).toHaveLength(1);
      expect(result.totalIssues).toBe(1);
    });

    it('should support zero issues', () => {
      const result: MemoryAnalysisResult = {
        patterns: {
          unsubscribedObservables: [],
          missingOnDestroy: [],
          globalEventListeners: [],
          setIntervalWithoutClear: [],
          domReferences: [],
          circularReferences: [],
        },
        practices: {
          largeDataStructures: [],
          violations: [],
          suggestions: [],
        },
        recommendations: [],
        totalIssues: 0,
      };

      expect(result.totalIssues).toBe(0);
    });
  });

  describe('ComponentMemoryProfile interface', () => {
    it('should support all profile fields', () => {
      const profile: ComponentMemoryProfile = {
        fileName: 'app.component.ts',
        subscriptions: 5,
        timers: 2,
        eventListeners: 3,
        domReferences: 1,
        hasOnDestroy: true,
        memoryRisk: 'low',
      };

      expect(profile.fileName).toBe('app.component.ts');
      expect(profile.subscriptions).toBe(5);
      expect(profile.timers).toBe(2);
      expect(profile.eventListeners).toBe(3);
      expect(profile.domReferences).toBe(1);
      expect(profile.hasOnDestroy).toBe(true);
      expect(profile.memoryRisk).toBe('low');
    });

    it('should support high memory risk', () => {
      const profile: ComponentMemoryProfile = {
        fileName: 'heavy.component.ts',
        subscriptions: 20,
        timers: 10,
        eventListeners: 15,
        domReferences: 5,
        hasOnDestroy: false,
        memoryRisk: 'high',
      };

      expect(profile.memoryRisk).toBe('high');
      expect(profile.hasOnDestroy).toBe(false);
    });

    it('should support medium memory risk', () => {
      const profile: ComponentMemoryProfile = {
        fileName: 'medium.component.ts',
        subscriptions: 10,
        timers: 3,
        eventListeners: 5,
        domReferences: 2,
        hasOnDestroy: true,
        memoryRisk: 'medium',
      };

      expect(profile.memoryRisk).toBe('medium');
    });

    it('should support zero counts', () => {
      const profile: ComponentMemoryProfile = {
        fileName: 'simple.component.ts',
        subscriptions: 0,
        timers: 0,
        eventListeners: 0,
        domReferences: 0,
        hasOnDestroy: true,
        memoryRisk: 'low',
      };

      expect(profile.subscriptions).toBe(0);
      expect(profile.timers).toBe(0);
      expect(profile.eventListeners).toBe(0);
      expect(profile.domReferences).toBe(0);
    });

    it('should handle various file names', () => {
      const fileNames = [
        'src/app/components/dashboard.component.ts',
        'feature.service.ts',
        'shared/utils/helper.ts',
      ];

      fileNames.forEach(fileName => {
        const profile: ComponentMemoryProfile = {
          fileName,
          subscriptions: 0,
          timers: 0,
          eventListeners: 0,
          domReferences: 0,
          hasOnDestroy: true,
          memoryRisk: 'low',
        };
        expect(profile.fileName).toBe(fileName);
      });
    });
  });
});
