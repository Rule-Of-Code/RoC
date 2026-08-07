/**
 * Law Types Tests
 * Tests for the law.types type definitions
 */
import type {
  CheckerResult,
  ConstitutionalLaw,
  GlobOptions,
  LawCheckContext,
  LawResult,
} from '../../src/types/law.types';
import { ConfigFileUtils } from '../../src/utils/config-file-utils';

const createConfig = () => ConfigFileUtils.getMinimalDefaultConfig();

describe('law.types', () => {
  describe('ConstitutionalLaw interface', () => {
    it('should define required properties', () => {
      const config = createConfig();
      const law: ConstitutionalLaw = {
        id: 'TEST-001',
        name: 'Test Law',
        description: 'A test constitutional law',
        category: 'quality',
        severity: 'error',
        impact: 'high',
        paretoCore: true,
        applicableFrameworks: ['angular', 'react'],
        check: async (projectRoot: string) => ({
          passed: true,
          message: 'Test passed',
          score: 100,
          config,
        }),
      };

      expect(law.id).toBe('TEST-001');
      expect(law.name).toBe('Test Law');
      expect(law.paretoCore).toBe(true);
    });

    it('should support all category types', () => {
      const config = createConfig();
      const categories: ConstitutionalLaw['category'][] = [
        'foundational',
        'maintainability',
        'performance',
        'quality',
        'security',
      ];

      for (const category of categories) {
        const law: ConstitutionalLaw = {
          id: `CAT-${category}`,
          name: `${category} Law`,
          description: 'Test',
          category,
          severity: 'info',
          impact: 'medium',
          paretoCore: false,
          applicableFrameworks: [],
          check: async () => ({
            passed: true,
            message: 'OK',
            score: 100,
            config,
          }),
        };
        expect(law.category).toBe(category);
      }
    });

    it('should support all severity levels', () => {
      const severities: ConstitutionalLaw['severity'][] = [
        'error',
        'warning',
        'info',
      ];
      expect(severities).toHaveLength(3);
    });

    it('should support all impact levels', () => {
      const impacts: ConstitutionalLaw['impact'][] = ['high', 'medium', 'low'];
      expect(impacts).toHaveLength(3);
    });
  });

  describe('LawResult interface', () => {
    it('should define required result properties', () => {
      const result: LawResult = {
        passed: true,
        message: 'All checks passed',
        score: 100,
        config: createConfig(),
      };

      expect(result.passed).toBe(true);
      expect(result.message).toBe('All checks passed');
      expect(result.score).toBe(100);
    });

    it('should support optional lawName', () => {
      const result: LawResult = {
        lawName: 'TEST-001',
        passed: true,
        message: 'OK',
        score: 100,
        config: createConfig(),
      };

      expect(result.lawName).toBe('TEST-001');
    });

    it('should support optional details array', () => {
      const result: LawResult = {
        passed: false,
        message: 'Check failed',
        score: 50,
        details: ['Detail 1', 'Detail 2', 'Detail 3'],
        config: createConfig(),
      };

      expect(result.details).toHaveLength(3);
      expect(result.details).toContain('Detail 1');
    });

    it('should support fixable information', () => {
      const result: LawResult = {
        passed: false,
        message: 'Issue found',
        score: 75,
        fixable: true,
        fixCommand: 'npm run fix',
        config: createConfig(),
      };

      expect(result.fixable).toBe(true);
      expect(result.fixCommand).toBe('npm run fix');
    });

    it('should support suggestions and violations', () => {
      const result: LawResult = {
        passed: false,
        message: 'Violations found',
        score: 60,
        violations: ['Missing file', 'Invalid config'],
        suggestions: ['Create the file', 'Fix the config'],
        config: createConfig(),
      };

      expect(result.violations).toHaveLength(2);
      expect(result.suggestions).toHaveLength(2);
    });

    it('should support optional metrics', () => {
      const result: LawResult = {
        passed: true,
        message: 'OK',
        score: 100,
        metrics: {
          filesChecked: 100,
          issuesFound: 0,
          duration: 1500,
        },
        config: createConfig(),
      };

      expect(result.metrics?.filesChecked).toBe(100);
      expect(result.metrics?.issuesFound).toBe(0);
    });
  });

  describe('LawCheckContext interface', () => {
    it('should define context properties', () => {
      const context: LawCheckContext = {
        projectRoot: '/project/root',
        config: createConfig(),
      };

      expect(context.projectRoot).toBe('/project/root');
      expect(context.config).toBeDefined();
    });

    it('should support optional lawId', () => {
      const context: LawCheckContext = {
        projectRoot: '/project',
        config: createConfig(),
        lawId: 'LAW-001',
      };

      expect(context.lawId).toBe('LAW-001');
    });
  });

  describe('CheckerResult interface', () => {
    it('should define checker result properties', () => {
      const result: CheckerResult = {
        violations: ['Violation 1', 'Violation 2'],
        suggestions: ['Suggestion 1'],
        score: 75,
      };

      expect(result.violations).toHaveLength(2);
      expect(result.suggestions).toHaveLength(1);
      expect(result.score).toBe(75);
    });

    it('should support empty arrays', () => {
      const result: CheckerResult = {
        violations: [],
        suggestions: [],
        score: 100,
      };

      expect(result.violations).toHaveLength(0);
      expect(result.suggestions).toHaveLength(0);
    });
  });

  describe('GlobOptions interface', () => {
    it('should define cwd property', () => {
      const options: GlobOptions = {
        cwd: '/project/root',
      };

      expect(options.cwd).toBe('/project/root');
    });

    it('should support optional ignore patterns', () => {
      const options: GlobOptions = {
        cwd: '/project',
        ignore: ['node_modules/**', 'dist/**'],
      };

      expect(options.ignore).toHaveLength(2);
      expect(options.ignore).toContain('node_modules/**');
    });
  });
});
