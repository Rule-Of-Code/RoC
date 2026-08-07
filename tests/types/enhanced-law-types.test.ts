/**
 * Tests for Enhanced Constitutional Law Types
 *
 * Tests type definitions for enhanced law configurations.
 */
import {
  AutomationType,
  EnhancedConstitutionalLaw,
  FrameworkLaws,
  LawCategory,
  LawPriority,
  LawSeverity,
  ParetoCategories,
  ProjectLaws,
} from '../../src/types/enhanced-law.types';

describe('EnhancedLawTypes', () => {
  describe('LawPriority type', () => {
    it('should allow CRITICAL value', () => {
      const priority: LawPriority = 'CRITICAL';
      expect(priority).toBe('CRITICAL');
    });

    it('should allow HIGH value', () => {
      const priority: LawPriority = 'HIGH';
      expect(priority).toBe('HIGH');
    });

    it('should allow MEDIUM value', () => {
      const priority: LawPriority = 'MEDIUM';
      expect(priority).toBe('MEDIUM');
    });

    it('should allow LOW value', () => {
      const priority: LawPriority = 'LOW';
      expect(priority).toBe('LOW');
    });
  });

  describe('LawCategory type', () => {
    it('should allow CODE_QUALITY value', () => {
      const category: LawCategory = 'CODE_QUALITY';
      expect(category).toBe('CODE_QUALITY');
    });

    it('should allow SECURITY value', () => {
      const category: LawCategory = 'SECURITY';
      expect(category).toBe('SECURITY');
    });

    it('should allow TESTING value', () => {
      const category: LawCategory = 'TESTING';
      expect(category).toBe('TESTING');
    });

    it('should allow PERFORMANCE value', () => {
      const category: LawCategory = 'PERFORMANCE';
      expect(category).toBe('PERFORMANCE');
    });

    it('should allow DEPLOYMENT value', () => {
      const category: LawCategory = 'DEPLOYMENT';
      expect(category).toBe('DEPLOYMENT');
    });

    it('should allow DOCUMENTATION value', () => {
      const category: LawCategory = 'DOCUMENTATION';
      expect(category).toBe('DOCUMENTATION');
    });

    it('should allow FRAMEWORK value', () => {
      const category: LawCategory = 'FRAMEWORK';
      expect(category).toBe('FRAMEWORK');
    });

    it('should allow PROJECT_SPECIFIC value', () => {
      const category: LawCategory = 'PROJECT_SPECIFIC';
      expect(category).toBe('PROJECT_SPECIFIC');
    });

    it('should allow SACRED_LAW value', () => {
      const category: LawCategory = 'SACRED_LAW';
      expect(category).toBe('SACRED_LAW');
    });

    it('should allow VERSION_CONTROL value', () => {
      const category: LawCategory = 'VERSION_CONTROL';
      expect(category).toBe('VERSION_CONTROL');
    });
  });

  describe('AutomationType type', () => {
    it('should allow AUTOMATED value', () => {
      const automation: AutomationType = 'AUTOMATED';
      expect(automation).toBe('AUTOMATED');
    });

    it('should allow MANUAL value', () => {
      const automation: AutomationType = 'MANUAL';
      expect(automation).toBe('MANUAL');
    });

    it('should allow CONFIGURABLE value', () => {
      const automation: AutomationType = 'CONFIGURABLE';
      expect(automation).toBe('CONFIGURABLE');
    });
  });

  describe('LawSeverity type', () => {
    it('should allow error value', () => {
      const severity: LawSeverity = 'error';
      expect(severity).toBe('error');
    });

    it('should allow warning value', () => {
      const severity: LawSeverity = 'warning';
      expect(severity).toBe('warning');
    });

    it('should allow info value', () => {
      const severity: LawSeverity = 'info';
      expect(severity).toBe('info');
    });
  });

  describe('EnhancedConstitutionalLaw interface', () => {
    it('should require id as string', () => {
      const law: EnhancedConstitutionalLaw = {
        id: 'law-001',
        subsection: '1.1',
        title: 'Test Law',
        emoji: '📋',
        description: 'Test description',
        priority: 'HIGH',
        category: 'TESTING',
        automation: 'AUTOMATED',
        defaultEnabled: true,
        defaultSeverity: 'error',
        violationMessage: 'Violation found',
        remediation: 'Fix it',
      };
      expect(typeof law.id).toBe('string');
    });

    it('should allow optional article property', () => {
      const law: EnhancedConstitutionalLaw = {
        id: 'law-002',
        article: 'Article 1',
        subsection: '1.2',
        title: 'Test Law',
        emoji: '📋',
        description: 'Test description',
        priority: 'MEDIUM',
        category: 'SECURITY',
        automation: 'MANUAL',
        defaultEnabled: false,
        defaultSeverity: 'warning',
        violationMessage: 'Warning',
        remediation: 'Check manually',
      };
      expect(law.article).toBe('Article 1');
    });

    it('should allow optional section property', () => {
      const law: EnhancedConstitutionalLaw = {
        id: 'law-003',
        section: 'Section 2',
        subsection: '2.1',
        title: 'Test Law',
        emoji: '🔒',
        description: 'Security check',
        priority: 'CRITICAL',
        category: 'SECURITY',
        automation: 'AUTOMATED',
        defaultEnabled: true,
        defaultSeverity: 'error',
        violationMessage: 'Critical violation',
        remediation: 'Immediate fix required',
      };
      expect(law.section).toBe('Section 2');
    });

    it('should allow optional checkFunction property', () => {
      const law: EnhancedConstitutionalLaw = {
        id: 'law-004',
        subsection: '3.1',
        title: 'Automated Check',
        emoji: '⚙️',
        description: 'Automated check',
        priority: 'HIGH',
        category: 'CODE_QUALITY',
        automation: 'AUTOMATED',
        defaultEnabled: true,
        defaultSeverity: 'error',
        checkFunction: 'checkCodeQuality',
        violationMessage: 'Code quality issue',
        remediation: 'Improve code',
      };
      expect(law.checkFunction).toBe('checkCodeQuality');
    });

    it('should allow optional legacyId property', () => {
      const law: EnhancedConstitutionalLaw = {
        id: 'law-005',
        subsection: '4.1',
        title: 'Migrated Law',
        emoji: '🔄',
        description: 'Migrated from legacy',
        priority: 'LOW',
        category: 'DOCUMENTATION',
        automation: 'CONFIGURABLE',
        defaultEnabled: true,
        defaultSeverity: 'info',
        violationMessage: 'Documentation needed',
        remediation: 'Add docs',
        legacyId: 42,
      };
      expect(law.legacyId).toBe(42);
    });
  });

  describe('ParetoCategories interface', () => {
    it('should have HIGH_IMPACT array', () => {
      const categories: ParetoCategories = {
        HIGH_IMPACT: ['law-001', 'law-002'],
        MEDIUM_IMPACT: ['law-003'],
        LOW_IMPACT: ['law-004'],
      };
      expect(Array.isArray(categories.HIGH_IMPACT)).toBe(true);
    });

    it('should have MEDIUM_IMPACT array', () => {
      const categories: ParetoCategories = {
        HIGH_IMPACT: [],
        MEDIUM_IMPACT: ['law-001', 'law-002', 'law-003'],
        LOW_IMPACT: [],
      };
      expect(categories.MEDIUM_IMPACT.length).toBe(3);
    });

    it('should have LOW_IMPACT array', () => {
      const categories: ParetoCategories = {
        HIGH_IMPACT: [],
        MEDIUM_IMPACT: [],
        LOW_IMPACT: ['law-001'],
      };
      expect(categories.LOW_IMPACT.length).toBe(1);
    });
  });

  describe('FrameworkLaws interface', () => {
    it('should have angular array', () => {
      const frameworks: FrameworkLaws = {
        angular: ['law-001', 'law-002'],
        react: [],
        vue: [],
      };
      expect(Array.isArray(frameworks.angular)).toBe(true);
    });

    it('should have react array', () => {
      const frameworks: FrameworkLaws = {
        angular: [],
        react: ['law-001'],
        vue: [],
      };
      expect(frameworks.react.length).toBe(1);
    });

    it('should have vue array', () => {
      const frameworks: FrameworkLaws = {
        angular: [],
        react: [],
        vue: ['law-001', 'law-002', 'law-003'],
      };
      expect(frameworks.vue.length).toBe(3);
    });
  });

  describe('ProjectLaws type', () => {
    it('should allow empty record', () => {
      const laws: ProjectLaws = {};
      expect(Object.keys(laws).length).toBe(0);
    });

    it('should allow project-specific laws', () => {
      const laws: ProjectLaws = {
        'my-project': ['law-001', 'law-002'],
      };
      expect(laws['my-project']!.length).toBe(2);
    });

    it('should allow multiple projects', () => {
      const laws: ProjectLaws = {
        frontend: ['law-001'],
        backend: ['law-002'],
        shared: ['law-003', 'law-004'],
      };
      expect(Object.keys(laws).length).toBe(3);
    });
  });
});
