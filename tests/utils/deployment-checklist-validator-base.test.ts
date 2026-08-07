/**
 * Checklist Validator Base Tests
 * Tests for ChecklistValidatorBase class
 */
import { DEFAULT_CONFIG } from '../../src/config/types';
import { CheckerUtils } from '../../src/utils/checker-utils';
import { ChecklistValidatorBase } from '../../src/utils/deployment/checklist-validator-base';
import { FileUtils } from '../../src/utils/file-utils';
import { PathOperations } from '../../src/utils/path-operations';

describe('ChecklistValidatorBase', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('checklist-validator-test-');
  });

  afterEach(() => {
    if (tempDir && FileUtils.exists(tempDir)) {
      FileUtils.deleteDirectory(tempDir);
    }
  });

  // ============================================
  // parseChecklistContent Tests
  // ============================================
  describe('parseChecklistContent()', () => {
    it('should return zero items for empty content', () => {
      const result = (
        ChecklistValidatorBase as unknown as {
          parseChecklistContent: (content: string) => {
            totalItems: number;
            completedItems: number;
            completionRate: number;
          };
        }
      ).parseChecklistContent('');

      expect(result.totalItems).toBe(0);
      expect(result.completedItems).toBe(0);
      expect(result.completionRate).toBe(0);
    });

    it('should count unchecked items correctly', () => {
      const content = `
- [ ] Task 1
- [ ] Task 2
- [ ] Task 3
`;
      const result = (
        ChecklistValidatorBase as unknown as {
          parseChecklistContent: (content: string) => {
            totalItems: number;
            completedItems: number;
            completionRate: number;
          };
        }
      ).parseChecklistContent(content);

      expect(result.totalItems).toBe(3);
      expect(result.completedItems).toBe(0);
      expect(result.completionRate).toBe(0);
    });

    it('should count checked items correctly', () => {
      const content = `
- [x] Task 1
- [x] Task 2
- [x] Task 3
`;
      const result = (
        ChecklistValidatorBase as unknown as {
          parseChecklistContent: (content: string) => {
            totalItems: number;
            completedItems: number;
            completionRate: number;
          };
        }
      ).parseChecklistContent(content);

      expect(result.totalItems).toBe(3);
      expect(result.completedItems).toBe(3);
      expect(result.completionRate).toBe(100);
    });

    it('should handle mixed checked and unchecked items', () => {
      const content = `
- [x] Task 1
- [ ] Task 2
- [x] Task 3
- [ ] Task 4
`;
      const result = (
        ChecklistValidatorBase as unknown as {
          parseChecklistContent: (content: string) => {
            totalItems: number;
            completedItems: number;
            completionRate: number;
          };
        }
      ).parseChecklistContent(content);

      expect(result.totalItems).toBe(4);
      expect(result.completedItems).toBe(2);
      expect(result.completionRate).toBe(50);
    });

    it('should only match lowercase x as checked (regex limitation)', () => {
      // Note: The regex pattern [x\s] only matches lowercase x
      // Uppercase X is not matched by the pattern
      const content = `
- [X] Task 1 (not matched by regex)
- [x] Task 2
`;
      const result = (
        ChecklistValidatorBase as unknown as {
          parseChecklistContent: (content: string) => {
            totalItems: number;
            completedItems: number;
            completionRate: number;
          };
        }
      ).parseChecklistContent(content);

      // Only lowercase x is matched by the regex [x\s]
      expect(result.totalItems).toBe(1);
      expect(result.completedItems).toBe(1);
      expect(result.completionRate).toBe(100);
    });

    it('should handle indented checkboxes', () => {
      const content = `
  - [x] Indented Task 1
    - [ ] Double indented Task 2
`;
      const result = (
        ChecklistValidatorBase as unknown as {
          parseChecklistContent: (content: string) => {
            totalItems: number;
            completedItems: number;
            completionRate: number;
          };
        }
      ).parseChecklistContent(content);

      expect(result.totalItems).toBe(2);
      expect(result.completedItems).toBe(1);
      expect(result.completionRate).toBe(50);
    });
  });

  // ============================================
  // buildEmptyChecklistResult Tests
  // ============================================
  describe('buildEmptyChecklistResult()', () => {
    it('should return default empty result', () => {
      const result = (
        ChecklistValidatorBase as unknown as {
          buildEmptyChecklistResult: () => {
            exists: boolean;
            isComplete: boolean;
            completionRate: number;
            totalItems: number;
            completedItems: number;
          };
        }
      ).buildEmptyChecklistResult();

      expect(result.exists).toBe(false);
      expect(result.isComplete).toBe(false);
      expect(result.completionRate).toBe(0);
      expect(result.totalItems).toBe(0);
      expect(result.completedItems).toBe(0);
    });
  });

  // ============================================
  // buildChecklistResult Tests
  // ============================================
  describe('buildChecklistResult()', () => {
    it('should mark as complete when rate meets requirement', () => {
      const result = (
        ChecklistValidatorBase as unknown as {
          buildChecklistResult: (
            totalItems: number,
            completedItems: number,
            completionRate: number,
            requiredCompletionRate: number
          ) => {
            exists: boolean;
            isComplete: boolean;
            completionRate: number;
            totalItems: number;
            completedItems: number;
          };
        }
      ).buildChecklistResult(10, 10, 100, 100);

      expect(result.exists).toBe(true);
      expect(result.isComplete).toBe(true);
      expect(result.completionRate).toBe(100);
      expect(result.totalItems).toBe(10);
      expect(result.completedItems).toBe(10);
    });

    it('should mark as incomplete when rate is below requirement', () => {
      const result = (
        ChecklistValidatorBase as unknown as {
          buildChecklistResult: (
            totalItems: number,
            completedItems: number,
            completionRate: number,
            requiredCompletionRate: number
          ) => {
            exists: boolean;
            isComplete: boolean;
            completionRate: number;
            totalItems: number;
            completedItems: number;
          };
        }
      ).buildChecklistResult(10, 5, 50, 100);

      expect(result.exists).toBe(true);
      expect(result.isComplete).toBe(false);
      expect(result.completionRate).toBe(50);
      expect(result.totalItems).toBe(10);
      expect(result.completedItems).toBe(5);
    });

    it('should mark as complete when rate equals requirement', () => {
      const result = (
        ChecklistValidatorBase as unknown as {
          buildChecklistResult: (
            totalItems: number,
            completedItems: number,
            completionRate: number,
            requiredCompletionRate: number
          ) => {
            exists: boolean;
            isComplete: boolean;
            completionRate: number;
            totalItems: number;
            completedItems: number;
          };
        }
      ).buildChecklistResult(10, 8, 80, 80);

      expect(result.exists).toBe(true);
      expect(result.isComplete).toBe(true);
      expect(result.completionRate).toBe(80);
    });
  });

  // ============================================
  // validateChecklistFile Tests
  // ============================================
  describe('validateChecklistFile()', () => {
    let findFilesByExtensionSpy: jest.SpyInstance;

    afterEach(() => {
      if (findFilesByExtensionSpy) {
        findFilesByExtensionSpy.mockRestore();
      }
    });

    it('should return empty result when file does not exist', () => {
      findFilesByExtensionSpy = jest
        .spyOn(CheckerUtils, 'findFilesByExtension')
        .mockReturnValue([]);

      const result = (
        ChecklistValidatorBase as unknown as {
          validateChecklistFile: (
            projectRoot: string,
            config: typeof DEFAULT_CONFIG,
            checklistFileName: string,
            requiredCompletionRate: number
          ) => {
            exists: boolean;
            isComplete: boolean;
            completionRate: number;
            totalItems: number;
            completedItems: number;
          };
        }
      ).validateChecklistFile(tempDir, DEFAULT_CONFIG, 'CHECKLIST.md', 100);

      expect(result.exists).toBe(false);
      expect(result.isComplete).toBe(false);
      expect(result.completionRate).toBe(0);
      expect(result.totalItems).toBe(0);
      expect(result.completedItems).toBe(0);
    });

    it('should validate existing checklist file', () => {
      const checklistPath = PathOperations.join(tempDir, 'CHECKLIST.md');
      FileUtils.writeFile(
        checklistPath,
        `# Checklist
- [x] Task 1
- [x] Task 2
- [ ] Task 3
`
      );

      findFilesByExtensionSpy = jest
        .spyOn(CheckerUtils, 'findFilesByExtension')
        .mockReturnValue([checklistPath]);

      const result = (
        ChecklistValidatorBase as unknown as {
          validateChecklistFile: (
            projectRoot: string,
            config: typeof DEFAULT_CONFIG,
            checklistFileName: string,
            requiredCompletionRate: number
          ) => {
            exists: boolean;
            isComplete: boolean;
            completionRate: number;
            totalItems: number;
            completedItems: number;
          };
        }
      ).validateChecklistFile(tempDir, DEFAULT_CONFIG, 'CHECKLIST.md', 100);

      expect(result.exists).toBe(true);
      expect(result.isComplete).toBe(false);
      expect(result.completionRate).toBe(67);
      expect(result.totalItems).toBe(3);
      expect(result.completedItems).toBe(2);
    });

    // A checklist in a repository is a TEMPLATE: its boxes are ticked during an
    // actual deployment. We judge what it COVERS, never what has been ticked —
    // demanding ticked boxes demanded a committed lie (a backend consumer).
    it('should mark as complete when it covers the required concerns, unticked', () => {
      const checklistPath = PathOperations.join(tempDir, 'CHECKLIST.md');
      FileUtils.writeFile(
        checklistPath,
        `# Checklist
- [ ] Unit tests pass and the build compiles
- [ ] Security vulnerability scan complete
- [ ] Rollback plan verified
`
      );

      findFilesByExtensionSpy = jest
        .spyOn(CheckerUtils, 'findFilesByExtension')
        .mockReturnValue([checklistPath]);

      const result = (
        ChecklistValidatorBase as unknown as {
          validateChecklistFile: (
            projectRoot: string,
            config: typeof DEFAULT_CONFIG,
            checklistFileName: string,
            requiredCompletionRate: number
          ) => {
            exists: boolean;
            isComplete: boolean;
            completionRate: number;
            totalItems: number;
            completedItems: number;
          };
        }
      ).validateChecklistFile(tempDir, DEFAULT_CONFIG, 'CHECKLIST.md', 100);

      expect(result.exists).toBe(true);
      expect(result.isComplete).toBe(true);
      expect(result.completionRate).toBe(0); // nothing ticked, and that is fine
    });

    it('should be incomplete when a required concern is absent, however many boxes are ticked', () => {
      const checklistPath = PathOperations.join(tempDir, 'CHECKLIST.md');
      FileUtils.writeFile(
        checklistPath,
        `# Checklist
- [x] Task 1
- [x] Task 2
`
      );

      findFilesByExtensionSpy = jest
        .spyOn(CheckerUtils, 'findFilesByExtension')
        .mockReturnValue([checklistPath]);

      const result = (
        ChecklistValidatorBase as unknown as {
          validateChecklistFile: (
            projectRoot: string,
            config: typeof DEFAULT_CONFIG,
            checklistFileName: string,
            requiredCompletionRate: number
          ) => {
            exists: boolean;
            isComplete: boolean;
            completionRate: number;
            totalItems: number;
            completedItems: number;
          };
        }
      ).validateChecklistFile(tempDir, DEFAULT_CONFIG, 'CHECKLIST.md', 50);

      expect(result.exists).toBe(true);
      // 100% ticked, and still incomplete: "Task 1" and "Task 2" are steps for
      // nothing. Ticking boxes buys nothing, so there is nothing to gain by lying.
      expect(result.completionRate).toBe(100);
      expect(result.isComplete).toBe(false);
    });
  });

  // ============================================
  // CHECKBOX_PATTERN Tests
  // ============================================
  describe('CHECKBOX_PATTERN', () => {
    it('should be defined', () => {
      const pattern = (
        ChecklistValidatorBase as unknown as {
          CHECKBOX_PATTERN: RegExp;
        }
      ).CHECKBOX_PATTERN;

      expect(pattern).toBeDefined();
      expect(pattern instanceof RegExp).toBe(true);
    });
  });
});
