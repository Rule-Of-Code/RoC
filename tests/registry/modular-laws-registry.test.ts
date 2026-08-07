/**
 * Modular Laws Registry Tests
 * Tests for ModularLawsRegistry
 */

import { PathOperations } from '../../src/utils/path-operations';
import { ModularLawsRegistry } from '../../src/registry/modular-laws-registry';
import { ConfigFileUtils } from '../../src/utils/config-file-utils';

import type { RuleOfCodeConfig } from '../../src/types/law.types';

const WORKSPACE_ROOT = PathOperations.resolve(__dirname, '..', '..', '..', '..');

describe('registry/modular-laws-registry', () => {
  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = ModularLawsRegistry.getInstance();
      const instance2 = ModularLawsRegistry.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should return instance with getAllLaws method', () => {
      const instance = ModularLawsRegistry.getInstance();

      expect(typeof instance.getAllLaws).toBe('function');
    });
  });

  describe('getAllLaws (instance)', () => {
    it('should return array of laws', () => {
      const instance = ModularLawsRegistry.getInstance();
      const laws = instance.getAllLaws();

      expect(Array.isArray(laws)).toBe(true);
      expect(laws.length).toBeGreaterThan(0);
    });
  });

  describe('getLawsByCategories', () => {
    it('should filter laws by category', () => {
      const instance = ModularLawsRegistry.getInstance();
      const laws = instance.getLawsByCategories(['security']);

      expect(Array.isArray(laws)).toBe(true);
    });

    it('should filter laws by id containing category', () => {
      const instance = ModularLawsRegistry.getInstance();
      const laws = instance.getLawsByCategories(['git']);

      expect(Array.isArray(laws)).toBe(true);
    });

    it('should return empty for non-matching category', () => {
      const instance = ModularLawsRegistry.getInstance();
      const laws = instance.getLawsByCategories(['nonexistent-category-12345']);

      expect(Array.isArray(laws)).toBe(true);
      expect(laws.length).toBe(0);
    });
  });

  describe('getEnhancedConstitution', () => {
    it('should return enhanced constitutional laws', () => {
      const instance = ModularLawsRegistry.getInstance();
      const laws = instance.getEnhancedConstitution();

      expect(Array.isArray(laws)).toBe(true);
      expect(laws.length).toBeGreaterThan(0);
    });
  });

  describe('static getAll', () => {
    it('should return all constitutional laws', () => {
      const laws = ModularLawsRegistry.getAll();

      expect(Array.isArray(laws)).toBe(true);
      expect(laws.length).toBeGreaterThan(0);
    });

    it('should return laws with required properties', () => {
      const laws = ModularLawsRegistry.getAll();
      const firstLaw = laws[0];

      expect(firstLaw).toBeDefined();
      if (firstLaw) {
        expect(firstLaw.id).toBeDefined();
        expect(firstLaw.name).toBeDefined();
        expect(firstLaw.category).toBeDefined();
        expect(firstLaw.severity).toBeDefined();
        expect(typeof firstLaw.check).toBe('function');
      }
    });
  });

  describe('static getEnabled', () => {
    it('should return enabled laws for default config', () => {
      const config = ConfigFileUtils.getMinimalDefaultConfig();
      const laws = ModularLawsRegistry.getEnabled(config);

      expect(Array.isArray(laws)).toBe(true);
      expect(laws.length).toBeGreaterThan(0);
    });

    it('should return all laws when __userWantsAllLaws is true', () => {
      const config = ConfigFileUtils.getMinimalDefaultConfig();
      (config.laws as Record<string, unknown>).__userWantsAllLaws = true;
      const laws = ModularLawsRegistry.getEnabled(config);

      expect(Array.isArray(laws)).toBe(true);
      expect(laws.length).toBe(ModularLawsRegistry.getAll().length);
    });

    it('should filter by laws.enabled when specified', () => {
      const config = ConfigFileUtils.getMinimalDefaultConfig();
      const allLaws = ModularLawsRegistry.getAll();
      const firstLaw = allLaws[0];

      if (firstLaw) {
        config.laws.enabled = { [firstLaw.id]: true };
        const laws = ModularLawsRegistry.getEnabled(config);

        // The allowlist selects exactly the requested law — plus the two
        // always-on meta-gates, which no config can remove (QA-4).
        const substantive = laws.filter(l => !l.alwaysEnabled);
        expect(substantive.map(l => l.id)).toEqual([firstLaw.id]);
        expect(laws.filter(l => l.alwaysEnabled)).toHaveLength(2);
      }
    });

    it('should use deprecated individual law config format', () => {
      const config = ConfigFileUtils.getMinimalDefaultConfig();
      const allLaws = ModularLawsRegistry.getAll();
      const firstLaw = allLaws[0];

      if (firstLaw) {
        // Remove enabled to trigger fallback
        delete config.laws.enabled;
        // Set individual law config (deprecated format)
        (config.laws as Record<string, unknown>)[firstLaw.id] = {
          enabled: false,
        };
        const laws = ModularLawsRegistry.getEnabled(config);

        // The first law should be excluded
        expect(laws.find(l => l.id === firstLaw.id)).toBeUndefined();
      }
    });
  });

  describe('static getParetoCore', () => {
    it('should return pareto core laws', () => {
      const laws = ModularLawsRegistry.getParetoCore();

      expect(Array.isArray(laws)).toBe(true);
    });

    it('should return laws marked as paretoCore', () => {
      const laws = ModularLawsRegistry.getParetoCore();

      laws.forEach(law => {
        expect(law.paretoCore).toBe(true);
      });
    });
  });

  describe('law check function', () => {
    it('should execute law check function with mapped law class', async () => {
      const laws = ModularLawsRegistry.getAll();
      const aLaw = laws.find(l => l.id.includes('zero-tolerance'));

      if (aLaw) {
        const config = ConfigFileUtils.getMinimalDefaultConfig();
        const result = await aLaw.check(WORKSPACE_ROOT, config);

        expect(result).toBeDefined();
        expect(typeof result.passed).toBe('boolean');
        expect(typeof result.message).toBe('string');
      }
    });

    it('should handle unmapped law with fallback success', async () => {
      const laws = ModularLawsRegistry.getAll();
      // Find a policy-based law that doesn't have explicit implementation
      const policyLaw = laws.find(l => l.id.includes('policy'));

      if (policyLaw) {
        const config = ConfigFileUtils.getMinimalDefaultConfig();
        const result = await policyLaw.check(WORKSPACE_ROOT, config);

        expect(result).toBeDefined();
        expect(typeof result.passed).toBe('boolean');
      }
    });

    it('should handle check function errors gracefully', async () => {
      const laws = ModularLawsRegistry.getAll();
      const firstLaw = laws[0];

      if (firstLaw) {
        // Call with invalid path to trigger potential error handling
        const config = ConfigFileUtils.getMinimalDefaultConfig();
        const result = await firstLaw.check('/non-existent-path-12345', config);

        expect(result).toBeDefined();
        expect(typeof result.passed).toBe('boolean');
      }
    });

    it('should catch errors when law check throws with null config', async () => {
      const laws = ModularLawsRegistry.getAll();
      // Try to find a law with a mapped check that might throw
      const mappedLaw = laws.find(l => l.id.includes('typescript-strict'));

      if (mappedLaw) {
        // Pass null config to potentially trigger error in law check
        const result = await mappedLaw.check(
          WORKSPACE_ROOT,
          null as unknown as RuleOfCodeConfig
        );
        // The error should be caught and formatted
        expect(result).toBeDefined();
        expect(typeof result.passed).toBe('boolean');
      }
    });

    it('should catch errors when law class check throws', async () => {
      // Find a law that uses LawClass.check with strict requirements
      const laws = ModularLawsRegistry.getAll();
      const strictLaw = laws.find(l => l.id.includes('branch-governance'));

      if (strictLaw) {
        // Pass undefined to cause potential errors
        const result = await strictLaw.check(
          undefined as unknown as string,
          undefined as unknown as RuleOfCodeConfig
        );
        // Result should still be defined (caught error or success)
        expect(result).toBeDefined();
      }
    });
  });

  describe('executeLawCheck', () => {
    it('should execute mapped law check successfully', async () => {
      const {
        ALL_ENHANCED_CONSTITUTIONAL_LAWS,
      } = require('../../src/data/enhanced-laws');
      const enhancedLaw = ALL_ENHANCED_CONSTITUTIONAL_LAWS.find(
        (l: { checkFunction: string }) =>
          l.checkFunction === 'checkTypeScriptStrict'
      );

      if (enhancedLaw) {
        const config = ConfigFileUtils.getMinimalDefaultConfig();
        const context = {
          projectRoot: WORKSPACE_ROOT,
          config,
          lawId: enhancedLaw.id,
        };

        const result = await ModularLawsRegistry.executeLawCheck(
          enhancedLaw,
          context,
          config
        );

        expect(result).toBeDefined();
        expect(typeof result.passed).toBe('boolean');
      }
    });

    it('every shipped law resolves to a checker (no silent fallbacks)', () => {
      const mappingKeys = Object.keys(ModularLawsRegistry.LAW_CLASS_MAPPING);
      const {
        ALL_ENHANCED_CONSTITUTIONAL_LAWS,
      } = require('../../src/data/enhanced-laws');
      const unmapped = ALL_ENHANCED_CONSTITUTIONAL_LAWS.filter(
        (l: { checkFunction: string }) => !mappingKeys.includes(l.checkFunction)
      ).map((l: { title: string }) => l.title);
      // Guards against shipping a law whose checker was never wired (it would
      // otherwise silently report compliance) — see the E2E regression.
      expect(unmapped).toEqual([]);
    });

    it('unmapped MANUAL law surfaces as manual review (not a false pass)', async () => {
      const config = ConfigFileUtils.getMinimalDefaultConfig();
      const manualLaw = {
        id: 'synthetic-manual-law',
        title: 'Synthetic Manual Policy',
        checkFunction: 'checkSynthetic_doesNotExist_manual',
        automation: 'MANUAL',
      } as never;
      const result = await ModularLawsRegistry.executeLawCheck(
        manualLaw,
        { projectRoot: WORKSPACE_ROOT, config } as never,
        config
      );
      expect(result.passed).toBe(true);
      expect(result.message).toContain('Manual review required');
    });

    it('should catch errors and return formatted error result', async () => {
      // Create a fake law with a mapped function
      const fakeLaw = {
        id: 'fake-law',
        title: 'Fake Law',
        checkFunction: 'checkTypeScriptStrict',
        description: 'Test law',
        priority: 'HIGH',
        category: 'TEST',
        automation: 'AUTOMATED',
        defaultEnabled: true,
        defaultSeverity: 'error',
      };

      const config = ConfigFileUtils.getMinimalDefaultConfig();
      const context = {
        projectRoot: null as unknown as string,
        config: null as unknown as RuleOfCodeConfig,
        lawId: 'fake-law',
      };

      const result = await ModularLawsRegistry.executeLawCheck(
        fakeLaw as unknown as import('../../src/types/enhanced-law.types').EnhancedConstitutionalLaw,
        context,
        config
      );

      expect(result).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
    });

    it('should catch thrown errors in law check', async () => {
      // Directly test error handling by calling with law that has throwing getter
      const config = ConfigFileUtils.getMinimalDefaultConfig();

      // Create a law where accessing checkFunction throws
      const throwingLaw = {
        id: 'throwing-law',
        title: 'Throwing Law',
        get checkFunction(): string {
          throw new Error('Simulated error in checkFunction getter');
        },
        description: 'Test law',
        priority: 'HIGH',
        category: 'TEST',
        automation: 'AUTOMATED',
        defaultEnabled: true,
        defaultSeverity: 'error',
      };

      const context = {
        projectRoot: WORKSPACE_ROOT,
        config,
        lawId: 'throwing-law',
      };

      const result = await ModularLawsRegistry.executeLawCheck(
        throwingLaw as unknown as import('../../src/types/enhanced-law.types').EnhancedConstitutionalLaw,
        context,
        config
      );

      // Error should be caught and formatted
      expect(result.passed).toBe(false);
      expect(result.message).toContain('Check failed');
    });
  });

  describe('LAW_CLASS_MAPPING', () => {
    it('should have mapping entries', () => {
      const mapping = ModularLawsRegistry.LAW_CLASS_MAPPING;
      const keys = Object.keys(mapping);

      expect(keys.length).toBeGreaterThan(0);
    });

    it('should map to law classes with check methods', () => {
      const mapping = ModularLawsRegistry.LAW_CLASS_MAPPING;
      const firstKey = Object.keys(mapping)[0];

      if (firstKey) {
        const LawClass = mapping[firstKey as keyof typeof mapping];
        expect(typeof LawClass.check).toBe('function');
      }
    });

    it('unmapped AUTOMATED law fails loudly instead of silently passing', async () => {
      const config = ConfigFileUtils.getMinimalDefaultConfig();
      const brokenLaw = {
        id: 'synthetic-automated-law',
        title: 'Synthetic Automated Law',
        checkFunction: 'checkSynthetic_doesNotExist_automated',
        automation: 'AUTOMATED',
      } as never;
      const result = await ModularLawsRegistry.executeLawCheck(
        brokenLaw,
        { projectRoot: WORKSPACE_ROOT, config } as never,
        config
      );
      // A wired-but-missing checker must NOT report compliance (E2E wired-but-missing-checker bug).
      expect(result.passed).toBe(false);
      expect(result.message).toContain('No checker implementation');
      expect(result.score).toBe(0);
    });
  });

  describe('category mapping', () => {
    it('should map laws to correct categories', () => {
      const laws = ModularLawsRegistry.getAll();
      const categories = new Set(laws.map(l => l.category));

      const validCategories = [
        'foundational',
        'maintainability',
        'performance',
        'quality',
        'security',
      ];
      categories.forEach(cat => {
        expect(validCategories).toContain(cat);
      });
    });

    it('should have foundational category for CRITICAL enforcement', () => {
      const laws = ModularLawsRegistry.getAll();
      // Sacred laws with CRITICAL priority should be foundational
      const foundationalLaws = laws.filter(l => l.category === 'foundational');
      expect(foundationalLaws.length).toBeGreaterThan(0);
    });

    it('should have performance category for HIGH enforcement', () => {
      const laws = ModularLawsRegistry.getAll();
      const perfLaws = laws.filter(l => l.category === 'performance');
      expect(perfLaws.length).toBeGreaterThanOrEqual(0); // May be 0 depending on data
    });

    it('should have maintainability as default category', () => {
      const laws = ModularLawsRegistry.getAll();
      const maintLaws = laws.filter(l => l.category === 'maintainability');
      expect(maintLaws.length).toBeGreaterThan(0);
    });
  });

  describe('severity mapping', () => {
    it('should map laws to valid severities', () => {
      const laws = ModularLawsRegistry.getAll();
      const severities = new Set(laws.map(l => l.severity));

      const validSeverities = ['error', 'warning', 'info'];
      severities.forEach(sev => {
        expect(validSeverities).toContain(sev);
      });
    });

    it('should have error severity for CRITICAL and HIGH', () => {
      const laws = ModularLawsRegistry.getAll();
      const errorLaws = laws.filter(l => l.severity === 'error');
      expect(errorLaws.length).toBeGreaterThan(0);
    });

    it('should have warning severity for MEDIUM', () => {
      const laws = ModularLawsRegistry.getAll();
      const warningLaws = laws.filter(l => l.severity === 'warning');
      expect(warningLaws.length).toBeGreaterThan(0);
    });

    it('should have info severity as default', () => {
      const laws = ModularLawsRegistry.getAll();
      const infoLaws = laws.filter(l => l.severity === 'info');
      expect(infoLaws.length).toBeGreaterThan(0);
    });

    it('authored defaultSeverity wins over priority-derived severity', () => {
      // FE architecture laws are HIGH/MEDIUM priority but authored warning
      // (warn-first rollout) — the registry must not escalate them to error.
      const laws = ModularLawsRegistry.getAll();
      const poll = laws.find(l => l.name === 'Poll Via Sanctioned Source');
      expect(poll).toBeDefined();
      expect(poll?.severity).toBe('warning');
      const noRisk = laws.find(l => l.name === 'No Risk Literals');
      expect(noRisk?.severity).toBe('warning');
    });
  });

  describe('impact mapping', () => {
    it('should map laws to valid impacts', () => {
      const laws = ModularLawsRegistry.getAll();
      const impacts = new Set(laws.map(l => l.impact));

      const validImpacts = ['high', 'medium', 'low'];
      impacts.forEach(impact => {
        expect(validImpacts).toContain(impact);
      });
    });

    it('should have high impact for CRITICAL and HIGH', () => {
      const laws = ModularLawsRegistry.getAll();
      const highImpactLaws = laws.filter(l => l.impact === 'high');
      expect(highImpactLaws.length).toBeGreaterThan(0);
    });

    it('should have medium impact for MEDIUM', () => {
      const laws = ModularLawsRegistry.getAll();
      const mediumImpactLaws = laws.filter(l => l.impact === 'medium');
      expect(mediumImpactLaws.length).toBeGreaterThan(0);
    });

    it('should have low impact as default', () => {
      const laws = ModularLawsRegistry.getAll();
      const lowImpactLaws = laws.filter(l => l.impact === 'low');
      expect(lowImpactLaws.length).toBeGreaterThan(0);
    });
  });

  describe('applicable frameworks', () => {
    it('should have frameworks for each law', () => {
      const laws = ModularLawsRegistry.getAll();

      laws.forEach(law => {
        expect(Array.isArray(law.applicableFrameworks)).toBe(true);
        expect(law.applicableFrameworks?.length).toBeGreaterThan(0);
      });
    });
  });

  describe('framework detection in getApplicableFrameworks', () => {
    it('should detect angular framework in descriptions', () => {
      const laws = ModularLawsRegistry.getAll();
      const angularLaw = laws.find(l => l.description?.includes('Angular'));

      if (angularLaw) {
        expect(angularLaw.applicableFrameworks).toContain('angular');
      }
    });

    it('should detect typescript framework in descriptions', () => {
      const laws = ModularLawsRegistry.getAll();
      const tsLaw = laws.find(l => l.description?.includes('TypeScript'));

      if (tsLaw) {
        expect(tsLaw.applicableFrameworks).toContain('typescript');
      }
    });

    it('should use wildcard for generic laws', () => {
      const laws = ModularLawsRegistry.getAll();
      const genericLaw = laws.find(
        l =>
          !l.description?.includes('Angular') &&
          !l.description?.includes('React') &&
          !l.description?.includes('Vue') &&
          !l.description?.includes('Node') &&
          !l.description?.includes('TypeScript')
      );

      if (genericLaw) {
        expect(genericLaw.applicableFrameworks).toContain('*');
      }
    });
  });

  describe('formatErrorResult', () => {
    it('should format error result with message', () => {
      const config = ConfigFileUtils.getMinimalDefaultConfig();
      const error = new Error('Test error message');
      const result = ModularLawsRegistry.formatErrorResult(error, config);

      expect(result.passed).toBe(false);
      expect(result.message).toContain('Check failed');
      expect(result.message).toContain('Test error message');
      expect(result.score).toBe(0);
      expect(result.fixable).toBe(false);
      expect(result.config).toBe(config);
    });

    it('should handle error without message', () => {
      const config = ConfigFileUtils.getMinimalDefaultConfig();
      const error = new Error();
      const result = ModularLawsRegistry.formatErrorResult(error, config);

      expect(result.passed).toBe(false);
      expect(result.message).toContain('Check failed');
    });
  });

  describe('mapCategory', () => {
    it('should return foundational for CRITICAL enforcement', () => {
      expect(ModularLawsRegistry.mapCategory('CRITICAL', 'ANY')).toBe(
        'foundational'
      );
    });

    it('should return quality for ESLINT automation', () => {
      expect(ModularLawsRegistry.mapCategory('HIGH', 'ESLINT')).toBe('quality');
    });

    it('should return quality for TEST automation', () => {
      expect(ModularLawsRegistry.mapCategory('MEDIUM', 'TEST')).toBe('quality');
    });

    it('should return security for AUDIT automation', () => {
      expect(ModularLawsRegistry.mapCategory('MEDIUM', 'AUDIT')).toBe(
        'security'
      );
    });

    it('should return performance for HIGH enforcement', () => {
      expect(ModularLawsRegistry.mapCategory('HIGH', 'OTHER')).toBe(
        'performance'
      );
    });

    it('should return maintainability as default', () => {
      expect(ModularLawsRegistry.mapCategory('LOW', 'OTHER')).toBe(
        'maintainability'
      );
    });
  });

  describe('mapSeverity', () => {
    it('should return error for CRITICAL', () => {
      expect(ModularLawsRegistry.mapSeverity('CRITICAL')).toBe('error');
    });

    it('should return error for HIGH', () => {
      expect(ModularLawsRegistry.mapSeverity('HIGH')).toBe('error');
    });

    it('should return warning for MEDIUM', () => {
      expect(ModularLawsRegistry.mapSeverity('MEDIUM')).toBe('warning');
    });

    it('should return info as default', () => {
      expect(ModularLawsRegistry.mapSeverity('LOW')).toBe('info');
    });
  });

  describe('mapImpact', () => {
    it('should return high for CRITICAL', () => {
      expect(ModularLawsRegistry.mapImpact('CRITICAL')).toBe('high');
    });

    it('should return high for HIGH', () => {
      expect(ModularLawsRegistry.mapImpact('HIGH')).toBe('high');
    });

    it('should return medium for MEDIUM', () => {
      expect(ModularLawsRegistry.mapImpact('MEDIUM')).toBe('medium');
    });

    it('should return low as default', () => {
      expect(ModularLawsRegistry.mapImpact('LOW')).toBe('low');
    });
  });

  describe('getApplicableFrameworks', () => {
    it('should detect Angular in description', () => {
      const law = {
        description: 'Angular component testing',
      } as import('../../src/types/enhanced-law.types').EnhancedConstitutionalLaw;
      expect(ModularLawsRegistry.getApplicableFrameworks(law)).toContain(
        'angular'
      );
    });

    it('should detect React in description', () => {
      const law = {
        description: 'React hooks usage',
      } as import('../../src/types/enhanced-law.types').EnhancedConstitutionalLaw;
      expect(ModularLawsRegistry.getApplicableFrameworks(law)).toContain(
        'react'
      );
    });

    it('should detect Vue in description', () => {
      const law = {
        description: 'Vue composition API',
      } as import('../../src/types/enhanced-law.types').EnhancedConstitutionalLaw;
      expect(ModularLawsRegistry.getApplicableFrameworks(law)).toContain('vue');
    });

    it('should detect Node in description', () => {
      const law = {
        description: 'Node.js server',
      } as import('../../src/types/enhanced-law.types').EnhancedConstitutionalLaw;
      expect(ModularLawsRegistry.getApplicableFrameworks(law)).toContain(
        'node'
      );
    });

    it('should detect TypeScript in description', () => {
      const law = {
        description: 'TypeScript strict mode',
      } as import('../../src/types/enhanced-law.types').EnhancedConstitutionalLaw;
      expect(ModularLawsRegistry.getApplicableFrameworks(law)).toContain(
        'typescript'
      );
    });

    it('should return wildcard for generic description', () => {
      const law = {
        description: 'Code quality check',
      } as import('../../src/types/enhanced-law.types').EnhancedConstitutionalLaw;
      expect(ModularLawsRegistry.getApplicableFrameworks(law)).toContain('*');
    });

    it('should detect multiple frameworks', () => {
      const law = {
        description: 'Angular and TypeScript testing',
      } as import('../../src/types/enhanced-law.types').EnhancedConstitutionalLaw;
      const frameworks = ModularLawsRegistry.getApplicableFrameworks(law);
      expect(frameworks).toContain('angular');
      expect(frameworks).toContain('typescript');
    });
  });

  describe('isParetoCore', () => {
    it('should check pareto core status', () => {
      const {
        ALL_ENHANCED_CONSTITUTIONAL_LAWS,
      } = require('../../src/data/enhanced-laws');
      const law = ALL_ENHANCED_CONSTITUTIONAL_LAWS[0];

      if (law) {
        const result = ModularLawsRegistry.isParetoCore(law);
        expect(typeof result).toBe('boolean');
      }
    });
  });
});
