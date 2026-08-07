/**
 * Tests for PerformanceBudgetTypes and PerformanceBudgetTypesConstants
 *
 * Tests type definitions and budget configuration detection.
 */
import {
  AngularProject,
  BuildConfiguration,
  PerformanceBudget,
  PerformanceBudgetTypesConstants,
} from '../../../src/laws/performance/performance-budget-compliance/constants/types';

describe('PerformanceBudgetTypes', () => {
  describe('PerformanceBudget interface', () => {
    it('should require type property', () => {
      const budget: PerformanceBudget = {
        type: 'initial',
      };
      expect(typeof budget.type).toBe('string');
    });

    it('should allow optional maximumWarning', () => {
      const budget: PerformanceBudget = {
        type: 'initial',
        maximumWarning: '500kb',
      };
      expect(budget.maximumWarning).toBe('500kb');
    });

    it('should allow optional maximumError', () => {
      const budget: PerformanceBudget = {
        type: 'initial',
        maximumError: '1mb',
      };
      expect(budget.maximumError).toBe('1mb');
    });

    it('should allow additional properties', () => {
      const budget: PerformanceBudget = {
        type: 'bundle',
        name: 'main',
        maximumWarning: '100kb',
      };
      expect(budget.name).toBe('main');
    });
  });

  describe('BuildConfiguration interface', () => {
    it('should allow optional budgets array', () => {
      const config: BuildConfiguration = {
        budgets: [{ type: 'initial', maximumWarning: '500kb' }],
      };
      expect(Array.isArray(config.budgets)).toBe(true);
    });

    it('should allow optional optimization boolean', () => {
      const config: BuildConfiguration = {
        optimization: true,
      };
      expect(config.optimization).toBe(true);
    });

    it('should allow optimization as object', () => {
      const config: BuildConfiguration = {
        optimization: { scripts: true, styles: true },
      };
      expect(typeof config.optimization).toBe('object');
    });

    it('should allow optional outputHashing', () => {
      const config: BuildConfiguration = {
        outputHashing: 'all',
      };
      expect(config.outputHashing).toBe('all');
    });

    it('should allow additional properties', () => {
      const config: BuildConfiguration = {
        sourceMap: false,
      };
      expect(config.sourceMap).toBe(false);
    });
  });

  describe('AngularProject interface', () => {
    it('should allow optional architect property', () => {
      const project: AngularProject = {};
      expect(project.architect).toBeUndefined();
    });

    it('should allow architect with build target', () => {
      const project: AngularProject = {
        architect: {
          build: {
            configurations: {
              production: {
                optimization: true,
              },
            },
          },
        },
      };
      expect(
        project.architect?.build?.configurations?.production
      ).toBeDefined();
    });
  });
});

describe('PerformanceBudgetTypesConstants', () => {
  describe('hasBudgetConfiguration', () => {
    it('should return false for empty budgets array', () => {
      const buildConfig: BuildConfiguration = { budgets: [] };
      const projects: string[] = [];
      expect(
        PerformanceBudgetTypesConstants.hasBudgetConfiguration(
          buildConfig,
          'app',
          'production',
          projects
        )
      ).toBe(false);
    });

    it('should return false for undefined budgets', () => {
      const buildConfig: BuildConfiguration = {};
      const projects: string[] = [];
      expect(
        PerformanceBudgetTypesConstants.hasBudgetConfiguration(
          buildConfig,
          'app',
          'production',
          projects
        )
      ).toBe(false);
    });

    it('accepts a lone initial budget (the primary bundle-size cap)', () => {
      // A single `initial` budget is the common modern setup and IS configured;
      // the old two-type requirement false-failed it.
      const buildConfig: BuildConfiguration = {
        budgets: [{ type: 'initial', maximumWarning: '500kb' }],
      };
      const projects: string[] = [];
      expect(
        PerformanceBudgetTypesConstants.hasBudgetConfiguration(
          buildConfig,
          'app',
          'production',
          projects
        )
      ).toBe(true);
    });

    it('accepts a lone component-style budget', () => {
      const buildConfig: BuildConfiguration = {
        budgets: [{ type: 'anyComponentStyle', maximumWarning: '4kb' }],
      };
      const projects: string[] = [];
      expect(
        PerformanceBudgetTypesConstants.hasBudgetConfiguration(
          buildConfig,
          'app',
          'production',
          projects
        )
      ).toBe(true);
    });

    it('should return true for initial and anyComponentStyle budgets', () => {
      const buildConfig: BuildConfiguration = {
        budgets: [
          { type: 'initial', maximumWarning: '500kb' },
          { type: 'anyComponentStyle', maximumWarning: '4kb' },
        ],
      };
      const projects: string[] = [];
      const result = PerformanceBudgetTypesConstants.hasBudgetConfiguration(
        buildConfig,
        'app',
        'production',
        projects
      );
      expect(result).toBe(true);
      expect(projects).toContain('app:production');
    });

    it('should return true for initial and bundle budgets', () => {
      const buildConfig: BuildConfiguration = {
        budgets: [
          { type: 'initial', maximumWarning: '500kb' },
          { type: 'bundle', maximumWarning: '100kb' },
        ],
      };
      const projects: string[] = [];
      const result = PerformanceBudgetTypesConstants.hasBudgetConfiguration(
        buildConfig,
        'my-app',
        'staging',
        projects
      );
      expect(result).toBe(true);
      expect(projects).toContain('my-app:staging');
    });

    it('should add to existing projects array', () => {
      const buildConfig: BuildConfiguration = {
        budgets: [
          { type: 'initial', maximumWarning: '500kb' },
          { type: 'anyComponentStyle', maximumWarning: '4kb' },
        ],
      };
      const projects: string[] = ['existing:config'];
      PerformanceBudgetTypesConstants.hasBudgetConfiguration(
        buildConfig,
        'new-app',
        'production',
        projects
      );
      expect(projects.length).toBe(2);
      expect(projects).toContain('existing:config');
      expect(projects).toContain('new-app:production');
    });
  });
});
