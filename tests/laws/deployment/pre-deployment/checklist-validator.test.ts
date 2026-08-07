/**
 * Tests for ChecklistDocumentValidator
 *
 * Comprehensive tests for pre-deployment checklist validation
 */
import {
  ChecklistDocumentValidator,
  checklistValidator,
} from '../../../../src/laws/deployment/pre-deployment/checklist-validator';
import type { LawCheckContext, RuleOfCodeConfig } from '../../../../src/types';
import { FileUtils } from '../../../../src/utils/file-utils';
import { PathOperations } from '../../../../src/utils/path-operations';

describe('ChecklistDocumentValidator', () => {
  let tempDir: string;
  let mockConfig: RuleOfCodeConfig;
  let mockContext: LawCheckContext;
  let validator: ChecklistDocumentValidator;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('checklist-validator-test-');
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
    validator = new ChecklistDocumentValidator();
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
  });

  describe('validate()', () => {
    it('should return isValid false when checklist not found', () => {
      const result = validator.validate(mockContext);
      expect(result.isValid).toBe(false);
    });

    it('should return exists false when checklist not found', () => {
      const result = validator.validate(mockContext);
      expect(result.exists).toBe(false);
    });

    it('should return isComplete false when checklist not found', () => {
      const result = validator.validate(mockContext);
      expect(result.isComplete).toBe(false);
    });

    it('should have error when validation fails', () => {
      const result = validator.validate(mockContext);
      expect(result.errors).toContain('Checklist validation failed');
    });

    it('should return completionRate 0 when checklist not found', () => {
      const result = validator.validate(mockContext);
      expect(result.completionRate).toBe(0);
    });

    it('should return totalItems 0 when checklist not found', () => {
      const result = validator.validate(mockContext);
      expect(result.totalItems).toBe(0);
    });

    it('should return completedItems 0 when checklist not found', () => {
      const result = validator.validate(mockContext);
      expect(result.completedItems).toBe(0);
    });

    it('should return isValid true when the checklist COVERS the required concerns', () => {
      // Unticked, and valid: the boxes are ticked at deployment time, against a
      // real release — never committed pre-ticked (a backend consumer).
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'PRE_DEPLOYMENT_CHECKLIST.md'),
        '# Checklist\n\n- [ ] Unit tests pass and the build compiles\n- [ ] Security vulnerability scan complete\n- [ ] Rollback plan verified'
      );
      const result = validator.validate(mockContext);
      expect(result.isValid).toBe(true);
    });

    it('should return isValid false when checklist below 90%', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'PRE_DEPLOYMENT_CHECKLIST.md'),
        '# Checklist\n\n- [x] Item 1\n- [ ] Item 2\n- [ ] Item 3\n- [ ] Item 4'
      );
      const result = validator.validate(mockContext);
      expect(result.isValid).toBe(false);
    });
  });

  describe('checkPreDeploymentChecklist()', () => {
    it('should return exists false when checklist not found', () => {
      const result = validator.checkPreDeploymentChecklist(tempDir, mockConfig);
      expect(result.exists).toBe(false);
    });

    it('should return isComplete false when checklist not found', () => {
      const result = validator.checkPreDeploymentChecklist(tempDir, mockConfig);
      expect(result.isComplete).toBe(false);
    });

    it('should return 0% completion when checklist not found', () => {
      const result = validator.checkPreDeploymentChecklist(tempDir, mockConfig);
      expect(result.completionRate).toBe(0);
    });

    it('should detect PRE_DEPLOYMENT_CHECKLIST.md when present', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'PRE_DEPLOYMENT_CHECKLIST.md'),
        '# Pre-Deployment Checklist\n\n- [ ] Task 1'
      );
      const result = validator.checkPreDeploymentChecklist(tempDir, mockConfig);
      expect(result.exists).toBe(true);
    });

    it('should count total items', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'PRE_DEPLOYMENT_CHECKLIST.md'),
        '# Checklist\n\n- [ ] Item 1\n- [ ] Item 2\n- [ ] Item 3'
      );
      const result = validator.checkPreDeploymentChecklist(tempDir, mockConfig);
      expect(result.totalItems).toBe(3);
    });

    it('should count completed items', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'PRE_DEPLOYMENT_CHECKLIST.md'),
        '# Checklist\n\n- [x] Item 1\n- [x] Item 2\n- [ ] Item 3'
      );
      const result = validator.checkPreDeploymentChecklist(tempDir, mockConfig);
      expect(result.completedItems).toBe(2);
    });

    it('should calculate correct completion rate', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'PRE_DEPLOYMENT_CHECKLIST.md'),
        '# Checklist\n\n- [x] Item 1\n- [x] Item 2\n- [ ] Item 3\n- [ ] Item 4'
      );
      const result = validator.checkPreDeploymentChecklist(tempDir, mockConfig);
      expect(result.completionRate).toBe(50);
    });

    it('should return isComplete true for an unticked checklist that covers the concerns', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'PRE_DEPLOYMENT_CHECKLIST.md'),
        '# Checklist\n\n- [ ] Unit tests pass and the build compiles\n- [ ] Security vulnerability scan complete\n- [ ] Rollback plan verified'
      );
      const result = validator.checkPreDeploymentChecklist(tempDir, mockConfig);
      expect(result.isComplete).toBe(true);
      expect(result.completionRate).toBe(0); // nothing ticked, and that is fine
    });

    it('should return isComplete false when boxes are ticked but concerns are absent', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'PRE_DEPLOYMENT_CHECKLIST.md'),
        '# Checklist\n\n- [x] Item 1\n- [x] Item 2\n- [x] Item 3'
      );
      const result = validator.checkPreDeploymentChecklist(tempDir, mockConfig);
      // Everything ticked, nothing covered: ticking buys nothing, so there is
      // nothing to gain by lying.
      expect(result.completionRate).toBe(100);
      expect(result.isComplete).toBe(false);
    });

    it('should return isComplete false below 90% completion', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'PRE_DEPLOYMENT_CHECKLIST.md'),
        '# Checklist\n\n- [x] Item 1\n- [ ] Item 2\n- [ ] Item 3'
      );
      const result = validator.checkPreDeploymentChecklist(tempDir, mockConfig);
      expect(result.isComplete).toBe(false);
    });
  });

  describe('generateChecklistTemplate()', () => {
    it('should return a string', () => {
      const result = validator.generateChecklistTemplate();
      expect(typeof result).toBe('string');
    });

    it('should include Pre-Deployment Checklist heading', () => {
      const result = validator.generateChecklistTemplate();
      expect(result).toContain('# Pre-Deployment Checklist');
    });

    it('should include Build & Testing section', () => {
      const result = validator.generateChecklistTemplate();
      expect(result).toContain('Build & Testing');
    });

    it('should include Security section', () => {
      const result = validator.generateChecklistTemplate();
      expect(result).toContain('Security');
    });

    it('should include Performance section', () => {
      const result = validator.generateChecklistTemplate();
      expect(result).toContain('Performance');
    });

    it('should include Configuration section', () => {
      const result = validator.generateChecklistTemplate();
      expect(result).toContain('Configuration');
    });

    it('should include Documentation section', () => {
      const result = validator.generateChecklistTemplate();
      expect(result).toContain('Documentation');
    });

    it('should include Monitoring section', () => {
      const result = validator.generateChecklistTemplate();
      expect(result).toContain('Monitoring');
    });

    it('should include Final Checks section', () => {
      const result = validator.generateChecklistTemplate();
      expect(result).toContain('Final Checks');
    });

    it('should include unchecked checklist items', () => {
      const result = validator.generateChecklistTemplate();
      expect(result).toContain('- [ ]');
    });

    it('should include unit tests item', () => {
      const result = validator.generateChecklistTemplate();
      expect(result).toContain('unit tests');
    });

    it('should include security vulnerability scan item', () => {
      const result = validator.generateChecklistTemplate();
      expect(result).toContain('Security vulnerability scan');
    });

    it('should include health checks item', () => {
      const result = validator.generateChecklistTemplate();
      expect(result).toContain('Health checks');
    });

    it('should include rollback item', () => {
      const result = validator.generateChecklistTemplate();
      expect(result).toContain('Rollback');
    });
  });

  describe('checklistValidator export', () => {
    it('should be an instance of ChecklistDocumentValidator', () => {
      expect(checklistValidator).toBeInstanceOf(ChecklistDocumentValidator);
    });

    it('should have validate method', () => {
      expect(typeof checklistValidator.validate).toBe('function');
    });

    it('should have checkPreDeploymentChecklist method', () => {
      expect(typeof checklistValidator.checkPreDeploymentChecklist).toBe(
        'function'
      );
    });

    it('should have generateChecklistTemplate method', () => {
      expect(typeof checklistValidator.generateChecklistTemplate).toBe(
        'function'
      );
    });
  });
});
