/**
 * Tests for utils/result-interfaces.ts - Standard Result Interfaces
 *
 * Tests ResultFactory utility class and interface compliance
 */

import {
  AnalysisResult,
  AngularAnalysisResult,
  CheckerResult,
  CodeQualityResult,
  ConfigAnalysisResult,
  NgRxAnalysisResult,
  PerformanceAnalysisResult,
  ResultFactory,
  SecurityAnalysisResult,
} from '../../src/utils/result-interfaces';

describe('utils/result-interfaces', () => {
  describe('AnalysisResult interface', () => {
    it('should define required violations property', () => {
      const result: AnalysisResult = {
        violations: ['Error 1'],
        suggestions: [],
      };

      expect(result.violations).toEqual(['Error 1']);
    });

    it('should define required suggestions property', () => {
      const result: AnalysisResult = {
        violations: [],
        suggestions: ['Suggestion 1'],
      };

      expect(result.suggestions).toEqual(['Suggestion 1']);
    });

    it('should allow optional passed property', () => {
      const result: AnalysisResult = {
        violations: [],
        suggestions: [],
        passed: true,
      };

      expect(result.passed).toBe(true);
    });

    it('should allow optional score property', () => {
      const result: AnalysisResult = {
        violations: [],
        suggestions: [],
        score: 85,
      };

      expect(result.score).toBe(85);
    });

    it('should allow optional metadata property', () => {
      const result: AnalysisResult = {
        violations: [],
        suggestions: [],
        metadata: { fileCount: 10 },
      };

      expect(result.metadata).toEqual({ fileCount: 10 });
    });
  });

  describe('CheckerResult interface', () => {
    it('should extend AnalysisResult', () => {
      const result: CheckerResult = {
        violations: [],
        suggestions: [],
        passed: true,
        score: 100,
      };

      expect(result.passed).toBe(true);
      expect(result.score).toBe(100);
    });

    it('should allow optional lawId', () => {
      const result: CheckerResult = {
        violations: [],
        suggestions: [],
        passed: true,
        score: 100,
        lawId: 'ngrx_a1b2c3d4',
      };

      expect(result.lawId).toBe('ngrx_a1b2c3d4');
    });

    it('should allow optional severity', () => {
      const result: CheckerResult = {
        violations: [],
        suggestions: [],
        passed: true,
        score: 100,
        severity: 'error',
      };

      expect(result.severity).toBe('error');
    });

    it('should support all severity levels', () => {
      const severities: Array<'error' | 'warning' | 'info'> = [
        'error',
        'warning',
        'info',
      ];

      for (const severity of severities) {
        const result: CheckerResult = {
          violations: [],
          suggestions: [],
          passed: true,
          score: 100,
          severity,
        };
        expect(result.severity).toBe(severity);
      }
    });
  });

  describe('ConfigAnalysisResult interface', () => {
    it('should extend AnalysisResult', () => {
      const result: ConfigAnalysisResult = {
        violations: [],
        suggestions: [],
      };

      expect(Array.isArray(result.violations)).toBe(true);
    });

    it('should allow optional configPath', () => {
      const result: ConfigAnalysisResult = {
        violations: [],
        suggestions: [],
        configPath: '/path/to/config.json',
      };

      expect(result.configPath).toBe('/path/to/config.json');
    });

    it('should allow optional configType', () => {
      const result: ConfigAnalysisResult = {
        violations: [],
        suggestions: [],
        configType: 'jest',
      };

      expect(result.configType).toBe('jest');
    });

    it('should allow optional isValid', () => {
      const result: ConfigAnalysisResult = {
        violations: [],
        suggestions: [],
        isValid: true,
      };

      expect(result.isValid).toBe(true);
    });

    it('should allow optional recommendations', () => {
      const result: ConfigAnalysisResult = {
        violations: [],
        suggestions: [],
        recommendations: ['Add strict mode'],
      };

      expect(result.recommendations).toEqual(['Add strict mode']);
    });
  });

  describe('CodeQualityResult interface', () => {
    it('should extend AnalysisResult', () => {
      const result: CodeQualityResult = {
        violations: [],
        suggestions: [],
        filesScanned: 10,
        patternsFound: 5,
      };

      expect(result.filesScanned).toBe(10);
      expect(result.patternsFound).toBe(5);
    });

    it('should allow optional complexity', () => {
      const result: CodeQualityResult = {
        violations: [],
        suggestions: [],
        filesScanned: 0,
        patternsFound: 0,
        complexity: 15,
      };

      expect(result.complexity).toBe(15);
    });

    it('should allow optional maintainabilityIndex', () => {
      const result: CodeQualityResult = {
        violations: [],
        suggestions: [],
        filesScanned: 0,
        patternsFound: 0,
        maintainabilityIndex: 75,
      };

      expect(result.maintainabilityIndex).toBe(75);
    });
  });

  describe('SecurityAnalysisResult interface', () => {
    it('should extend AnalysisResult', () => {
      const result: SecurityAnalysisResult = {
        violations: [],
        suggestions: [],
      };

      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('should support all risk levels', () => {
      const levels: Array<'critical' | 'high' | 'medium' | 'low'> = [
        'critical',
        'high',
        'medium',
        'low',
      ];

      for (const level of levels) {
        const result: SecurityAnalysisResult = {
          violations: [],
          suggestions: [],
          riskLevel: level,
        };
        expect(result.riskLevel).toBe(level);
      }
    });

    it('should allow vulnerabilities array', () => {
      const result: SecurityAnalysisResult = {
        violations: [],
        suggestions: [],
        vulnerabilities: [
          {
            type: 'SQL Injection',
            severity: 'critical',
            file: 'db.ts',
            line: 42,
            description: 'Unsanitized input',
          },
        ],
      };

      expect(result.vulnerabilities).toHaveLength(1);
      expect(result.vulnerabilities?.[0]?.type).toBe('SQL Injection');
    });

    it('should allow optional securityScore', () => {
      const result: SecurityAnalysisResult = {
        violations: [],
        suggestions: [],
        securityScore: 85,
      };

      expect(result.securityScore).toBe(85);
    });
  });

  describe('PerformanceAnalysisResult interface', () => {
    it('should extend AnalysisResult', () => {
      const result: PerformanceAnalysisResult = {
        violations: [],
        suggestions: [],
      };

      expect(Array.isArray(result.violations)).toBe(true);
    });

    it('should allow optional performanceScore', () => {
      const result: PerformanceAnalysisResult = {
        violations: [],
        suggestions: [],
        performanceScore: 90,
      };

      expect(result.performanceScore).toBe(90);
    });

    it('should allow optional optimizations', () => {
      const result: PerformanceAnalysisResult = {
        violations: [],
        suggestions: [],
        optimizations: ['Enable tree shaking', 'Lazy load modules'],
      };

      expect(result.optimizations).toHaveLength(2);
    });

    it('should allow optional bundleSize', () => {
      const result: PerformanceAnalysisResult = {
        violations: [],
        suggestions: [],
        bundleSize: 250000,
      };

      expect(result.bundleSize).toBe(250000);
    });

    it('should allow optional loadTime', () => {
      const result: PerformanceAnalysisResult = {
        violations: [],
        suggestions: [],
        loadTime: 1.5,
      };

      expect(result.loadTime).toBe(1.5);
    });
  });

  describe('AngularAnalysisResult interface', () => {
    it('should extend CodeQualityResult', () => {
      const result: AngularAnalysisResult = {
        violations: [],
        suggestions: [],
        filesScanned: 50,
        patternsFound: 10,
      };

      expect(result.filesScanned).toBe(50);
    });

    it('should allow optional angularVersion', () => {
      const result: AngularAnalysisResult = {
        violations: [],
        suggestions: [],
        filesScanned: 0,
        patternsFound: 0,
        angularVersion: '17.0.0',
      };

      expect(result.angularVersion).toBe('17.0.0');
    });

    it('should allow optional componentCount', () => {
      const result: AngularAnalysisResult = {
        violations: [],
        suggestions: [],
        filesScanned: 0,
        patternsFound: 0,
        componentCount: 25,
      };

      expect(result.componentCount).toBe(25);
    });

    it('should allow optional serviceCount', () => {
      const result: AngularAnalysisResult = {
        violations: [],
        suggestions: [],
        filesScanned: 0,
        patternsFound: 0,
        serviceCount: 15,
      };

      expect(result.serviceCount).toBe(15);
    });

    it('should allow optional moduleCount', () => {
      const result: AngularAnalysisResult = {
        violations: [],
        suggestions: [],
        filesScanned: 0,
        patternsFound: 0,
        moduleCount: 8,
      };

      expect(result.moduleCount).toBe(8);
    });

    it('should allow optional bestPractices', () => {
      const result: AngularAnalysisResult = {
        violations: [],
        suggestions: [],
        filesScanned: 0,
        patternsFound: 0,
        bestPractices: ['Use OnPush', 'Lazy load routes'],
      };

      expect(result.bestPractices).toHaveLength(2);
    });
  });

  describe('NgRxAnalysisResult interface', () => {
    it('should extend AngularAnalysisResult', () => {
      const result: NgRxAnalysisResult = {
        violations: [],
        suggestions: [],
        filesScanned: 100,
        patternsFound: 20,
      };

      expect(result.filesScanned).toBe(100);
    });

    it('should allow optional storeCompliant', () => {
      const result: NgRxAnalysisResult = {
        violations: [],
        suggestions: [],
        filesScanned: 0,
        patternsFound: 0,
        storeCompliant: true,
      };

      expect(result.storeCompliant).toBe(true);
    });

    it('should allow NgRx count properties', () => {
      const result: NgRxAnalysisResult = {
        violations: [],
        suggestions: [],
        filesScanned: 0,
        patternsFound: 0,
        actionCount: 50,
        reducerCount: 10,
        selectorCount: 30,
        effectCount: 15,
      };

      expect(result.actionCount).toBe(50);
      expect(result.reducerCount).toBe(10);
      expect(result.selectorCount).toBe(30);
      expect(result.effectCount).toBe(15);
    });
  });

  describe('ResultFactory', () => {
    describe('createAnalysisResult', () => {
      it('should create empty result with defaults', () => {
        const result = ResultFactory.createAnalysisResult();

        expect(result.violations).toEqual([]);
        expect(result.suggestions).toEqual([]);
        expect(result.passed).toBe(true);
        expect(result.score).toBe(100);
      });

      it('should set passed false when violations exist', () => {
        const result = ResultFactory.createAnalysisResult(['Error 1']);

        expect(result.passed).toBe(false);
      });

      it('should calculate score from violations', () => {
        const result = ResultFactory.createAnalysisResult([
          'Error 1',
          'Error 2',
          'Error 3',
        ]);

        expect(result.score).toBe(70); // 100 - 3*10
      });

      it('should not allow negative score', () => {
        const violations = Array(15).fill('Error');
        const result = ResultFactory.createAnalysisResult(violations);

        expect(result.score).toBe(0);
      });

      it('should include suggestions', () => {
        const result = ResultFactory.createAnalysisResult([], ['Suggestion 1']);

        expect(result.suggestions).toEqual(['Suggestion 1']);
      });

      it('should include metadata', () => {
        const result = ResultFactory.createAnalysisResult([], [], {
          key: 'value',
        });

        expect(result.metadata).toEqual({ key: 'value' });
      });
    });

    describe('createCheckerResult', () => {
      it('should create empty result with defaults', () => {
        const result = ResultFactory.createCheckerResult();

        expect(result.violations).toEqual([]);
        expect(result.suggestions).toEqual([]);
        expect(result.passed).toBe(true);
        expect(result.score).toBe(100);
        expect(result.severity).toBe('error');
      });

      it('should set passed false when violations exist', () => {
        const result = ResultFactory.createCheckerResult(['Error']);

        expect(result.passed).toBe(false);
      });

      it('should include lawId', () => {
        const result = ResultFactory.createCheckerResult(
          [],
          [],
          'test_12345678'
        );

        expect(result.lawId).toBe('test_12345678');
      });

      it('should include severity', () => {
        const result = ResultFactory.createCheckerResult(
          [],
          [],
          undefined,
          'warning'
        );

        expect(result.severity).toBe('warning');
      });

      it('should calculate score from violations', () => {
        const result = ResultFactory.createCheckerResult(['E1', 'E2']);

        expect(result.score).toBe(80);
      });
    });

    describe('createAngularResult', () => {
      it('should create empty result with defaults', () => {
        const result = ResultFactory.createAngularResult();

        expect(result.violations).toEqual([]);
        expect(result.filesScanned).toBe(0);
        expect(result.patternsFound).toBe(0);
        expect(result.passed).toBe(true);
      });

      it('should set filesScanned and patternsFound', () => {
        const result = ResultFactory.createAngularResult([], [], 50, 10);

        expect(result.filesScanned).toBe(50);
        expect(result.patternsFound).toBe(10);
      });

      it('should include Angular-specific defaults', () => {
        const result = ResultFactory.createAngularResult();

        expect(result.componentCount).toBe(0);
        expect(result.serviceCount).toBe(0);
        expect(result.moduleCount).toBe(0);
      });

      it('should use suggestions as bestPractices', () => {
        const result = ResultFactory.createAngularResult(
          [],
          ['Use OnPush'],
          0,
          0
        );

        expect(result.bestPractices).toEqual(['Use OnPush']);
      });
    });

    describe('createNgRxResult', () => {
      it('should create empty result with defaults', () => {
        const result = ResultFactory.createNgRxResult();

        expect(result.violations).toEqual([]);
        expect(result.filesScanned).toBe(0);
        expect(result.storeCompliant).toBe(true);
      });

      it('should set storeCompliant based on violations', () => {
        const result = ResultFactory.createNgRxResult(['Error']);

        expect(result.storeCompliant).toBe(false);
      });

      it('should include NgRx-specific count defaults', () => {
        const result = ResultFactory.createNgRxResult();

        expect(result.actionCount).toBe(0);
        expect(result.reducerCount).toBe(0);
        expect(result.selectorCount).toBe(0);
        expect(result.effectCount).toBe(0);
      });

      it('should set filesScanned and patternsFound', () => {
        const result = ResultFactory.createNgRxResult([], [], 100, 25);

        expect(result.filesScanned).toBe(100);
        expect(result.patternsFound).toBe(25);
      });

      it('should calculate score from violations', () => {
        const result = ResultFactory.createNgRxResult(['E1', 'E2', 'E3', 'E4']);

        expect(result.score).toBe(60);
      });
    });
  });
});
