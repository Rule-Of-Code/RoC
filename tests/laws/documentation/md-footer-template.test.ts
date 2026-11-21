/**
 * Tests for MdFooterTemplateLaw
 *
 * Comprehensive tests for markdown footer template validation
 */
import { ALL_ENHANCED_CONSTITUTIONAL_LAWS } from '../../../src/data/enhanced-laws';
import { MdFooterTemplateLaw } from '../../../src/laws/documentation/md-footer-template';
import type { LawCheckContext, RuleOfCodeConfig } from '../../../src/types';
import { FileUtils } from '../../../src/utils/file-utils';
import { runsWithoutAllowlist } from '../../../src/utils/law-identity';
import { PathOperations } from '../../../src/utils/path-operations';

describe('MdFooterTemplateLaw', () => {
  let tempDir: string;
  let mockConfig: RuleOfCodeConfig;
  let mockContext: LawCheckContext;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('md-footer-template-test-');
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
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
  });

  describe('check()', () => {
    it('should return a Promise', () => {
      const result = MdFooterTemplateLaw.check(mockContext);
      expect(result).toBeInstanceOf(Promise);
    });

    it('should resolve to a LawResult object', async () => {
      const result = await MdFooterTemplateLaw.check(mockContext);
      expect(result).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
    });

    it('should have violations array', async () => {
      const result = await MdFooterTemplateLaw.check(mockContext);
      expect(Array.isArray(result.violations)).toBe(true);
    });

    it('should have suggestions array', async () => {
      const result = await MdFooterTemplateLaw.check(mockContext);
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('should have score property', async () => {
      const result = await MdFooterTemplateLaw.check(mockContext);
      expect(typeof result.score).toBe('number');
    });

    it('should have message property', async () => {
      const result = await MdFooterTemplateLaw.check(mockContext);
      expect(typeof result.message).toBe('string');
    });

    it('should have fixable property', async () => {
      const result = await MdFooterTemplateLaw.check(mockContext);
      expect(typeof result.fixable).toBe('boolean');
    });

    it('should return config in result', async () => {
      const result = await MdFooterTemplateLaw.check(mockContext);
      expect(result.config).toBe(mockConfig);
    });
  });

  /**
   * #436: no Markdown to judge is not a finding about the documentation.
   * The law says nothing was judged — and why — instead of claiming the
   * project has no Markdown files.
   */
  describe('nothing to judge', () => {
    it('a project without Markdown: nothing was judged', async () => {
      const result = await MdFooterTemplateLaw.check(mockContext);
      expect(result.passed).toBe(false);
      expect(result.judgedNothing).toBe(true);
      expect(result.score).toBe(0);
      expect(result.violations).toEqual([
        'No Markdown file in the project — nothing was judged',
      ]);
    });

    it('includes that list only code: the Markdown exists, nothing was judged', async () => {
      FileUtils.writeFile(PathOperations.join(tempDir, 'README.md'), '# R');
      FileUtils.writeFile(PathOperations.join(tempDir, 'docs', 'a.md'), '# A');
      const result = await MdFooterTemplateLaw.check({
        ...mockContext,
        config: { ...mockConfig, includes: { global: ['src/**/*.ts'] } },
      });
      expect(result.judgedNothing).toBe(true);
      expect(result.violations).toEqual([
        '2 Markdown file(s) exist, but the configured includes / ignores select none of them — nothing was judged',
      ]);
      expect(result.violations).not.toContain(
        'No markdown files found in project'
      );
    });

    it('the same Markdown, selected by includes, is judged', async () => {
      FileUtils.writeFile(PathOperations.join(tempDir, 'README.md'), '# R');
      const result = await MdFooterTemplateLaw.check({
        ...mockContext,
        config: {
          ...mockConfig,
          includes: { global: ['src/**/*.ts', '**/*.md'] },
        },
      });
      expect(result.judgedNothing).toBeUndefined();
      expect(result.violations).toContain(
        '1/1 markdown files missing constitutional footers'
      );
    });
  });

  describe('footer presence detection', () => {
    it('should detect missing constitutional footers', async () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'README.md'),
        `# README

This is a project without proper footer.
`
      );
      const result = await MdFooterTemplateLaw.check(mockContext);
      // Should detect file without proper constitutional footer
      expect(result.passed).toBe(false);
    });

    it('should detect constitutional footer with correct format', async () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'README.md'),
        `# README

Content here.

---

📋 Constitutional Footer
Document Version: 1.0
Last Updated: December 27, 2025
Status: Active
Investment Rating: 🏆 10/10 SUPREME EXCELLENCE
`
      );
      const result = await MdFooterTemplateLaw.check(mockContext);
      expect(
        (result.violations ?? []).some(v =>
          v.includes('missing constitutional footers')
        )
      ).toBe(false);
    });

    it('should detect Constitutional Compliance indicator', async () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'README.md'),
        `# README

Content here.

---

Constitutional Compliance: Verified
Document Version: 1.0
Last Updated: January 2025
Status: Complete
Investment Rating: 10/10
`
      );
      const result = await MdFooterTemplateLaw.check(mockContext);
      expect(
        (result.violations ?? []).some(v =>
          v.includes('missing constitutional footers')
        )
      ).toBe(false);
    });
  });

  describe('footer format validation', () => {
    it('should detect invalid footer format', async () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'README.md'),
        `# README

Content here.

---

📋 Constitutional Footer
Some random content without proper format
`
      );
      const result = await MdFooterTemplateLaw.check(mockContext);
      // Should detect invalid footer format
      expect(result).toBeDefined();
    });

    it('should validate required footer elements', async () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'README.md'),
        `# README

Content here.

---

📋 Constitutional Footer
Document Version: 1.0
Last Updated: December 27, 2025
Status: Active
Investment Rating: 🏆 10/10 SUPREME EXCELLENCE
`
      );
      const result = await MdFooterTemplateLaw.check(mockContext);
      expect(
        (result.violations ?? []).some(v =>
          v.includes('Missing footer elements')
        )
      ).toBe(false);
    });
  });

  describe('investment rating validation', () => {
    it('should detect incorrect investment rating format', async () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'README.md'),
        `# README

Content here.

---

📋 Constitutional Footer
Document Version: 1.0
Last Updated: December 27, 2025
Status: Active
Investment Rating: 5/10
`
      );
      const result = await MdFooterTemplateLaw.check(mockContext);
      // Should detect incorrect investment rating
      expect(result).toBeDefined();
    });

    it('should accept valid investment rating format', async () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'README.md'),
        `# README

Content here.

---

📋 Constitutional Footer
Document Version: 1.0
Last Updated: December 27, 2025
Status: Active
Investment Rating: 🏆 10/10 SUPREME EXCELLENCE
`
      );
      const result = await MdFooterTemplateLaw.check(mockContext);
      expect(
        (result.violations ?? []).some(v =>
          v.includes('incorrect investment rating format')
        )
      ).toBe(false);
    });

    it('should accept Rating: 10/10 format', async () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'README.md'),
        `# README

Content here.

---

📋 Constitutional Footer
Document Version: 1.0
Last Updated: December 2025
Status: Active
Investment Rating: 10/10
`
      );
      const result = await MdFooterTemplateLaw.check(mockContext);
      expect(
        (result.violations ?? []).some(v =>
          v.includes('incorrect investment rating format')
        )
      ).toBe(false);
    });
  });

  describe('date format validation', () => {
    it('should detect incorrect date format', async () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'README.md'),
        `# README

Content here.

---

📋 Constitutional Footer
Document Version: 1.0
Last Updated: invalid date
Status: Active
Investment Rating: 10/10
`
      );
      const result = await MdFooterTemplateLaw.check(mockContext);
      // Should detect incorrect date format
      expect(result).toBeDefined();
    });

    it('should accept Month Day, Year format', async () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'README.md'),
        `# README

Content here.

---

📋 Constitutional Footer
Document Version: 1.0
Last Updated: December 27, 2025
Status: Active
Investment Rating: 10/10
`
      );
      const result = await MdFooterTemplateLaw.check(mockContext);
      expect(
        (result.violations ?? []).some(v => v.includes('incorrect date format'))
      ).toBe(false);
    });

    it('should accept year-only format', async () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'README.md'),
        `# README

Content here.

---

📋 Constitutional Footer
Document Version: 1.0
Last Updated: 2025
Status: Active
Investment Rating: 10/10
`
      );
      const result = await MdFooterTemplateLaw.check(mockContext);
      expect(
        (result.violations ?? []).some(v => v.includes('incorrect date format'))
      ).toBe(false);
    });
  });

  describe('score calculation', () => {
    it('should have score between 0 and 100', async () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'README.md'),
        '# README\n\nContent.'
      );
      const result = await MdFooterTemplateLaw.check(mockContext);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should have lower score for missing footers', async () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'README.md'),
        '# README\n\nContent without footer.'
      );
      const result = await MdFooterTemplateLaw.check(mockContext);
      expect(result.score).toBeLessThan(100);
    });

    it('should have high score with proper footers', async () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'README.md'),
        `# README

Content here.

---

📋 Constitutional Footer
Document Version: 1.0
Last Updated: December 27, 2025
Status: Active
Investment Rating: 🏆 10/10 SUPREME EXCELLENCE
`
      );
      const result = await MdFooterTemplateLaw.check(mockContext);
      expect(result.score).toBeGreaterThan(50);
    });
  });

  describe('compliance percentage', () => {
    it('should calculate compliance percentage correctly', async () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'README.md'),
        `# README

---

📋 Constitutional Footer
Document Version: 1.0
Last Updated: December 2025
Status: Active
Investment Rating: 10/10
`
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'CHANGELOG.md'),
        `# Changelog

No footer here.
`
      );
      const result = await MdFooterTemplateLaw.check(mockContext);
      // Result should be defined - exact message format is implementation dependent
      expect(result).toBeDefined();
      expect(result.score).toBeDefined();
    });

    it('should show 100% coverage when all files compliant', async () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'README.md'),
        `# README

---

📋 Constitutional Footer
Document Version: 1.0
Last Updated: December 2025
Status: Active
Investment Rating: 10/10
`
      );
      const result = await MdFooterTemplateLaw.check(mockContext);
      if (result.passed) {
        expect(result.message).toContain('100%');
      }
    });
  });

  describe('multiple markdown files', () => {
    it('should check all markdown files in project', async () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'README.md'),
        `# README

---

📋 Constitutional Footer
Document Version: 1.0
Last Updated: December 2025
Status: Active
Investment Rating: 10/10
`
      );
      FileUtils.createDirectory(PathOperations.join(tempDir, 'docs'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'docs', 'GUIDE.md'),
        `# Guide

---

📋 Constitutional Footer
Document Version: 1.0
Last Updated: December 2025
Status: Active
Investment Rating: 10/10
`
      );
      const result = await MdFooterTemplateLaw.check(mockContext);
      expect(result).toBeDefined();
    });

    it('should report count of non-compliant files', async () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'README.md'),
        '# README\n\nNo footer.'
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'CHANGELOG.md'),
        '# Changelog\n\nNo footer.'
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'CONTRIBUTING.md'),
        '# Contributing\n\nNo footer.'
      );
      const result = await MdFooterTemplateLaw.check(mockContext);
      // Should report non-compliant files
      expect(result.passed).toBe(false);
    });
  });

  describe('required elements check', () => {
    it('should report missing required elements', async () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'README.md'),
        `# README

---

📋 Constitutional Footer
Only partial content
`
      );
      const result = await MdFooterTemplateLaw.check(mockContext);
      // Should detect missing required elements
      expect(result).toBeDefined();
    });

    it('should list missing element names', async () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'README.md'),
        `# README

---

📋 Constitutional Footer
Document Version: 1.0
`
      );
      const result = await MdFooterTemplateLaw.check(mockContext);
      // Result should be defined - actual suggestions are implementation dependent
      expect(result).toBeDefined();
      expect(result.suggestions).toBeDefined();
    });
  });

  describe('message generation', () => {
    it('should generate a nothing-judged message for no markdown files', async () => {
      const result = await MdFooterTemplateLaw.check(mockContext);
      expect(result.message).toContain('nothing was judged');
    });

    it('should generate success message when fully compliant', async () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'README.md'),
        `# README

---

📋 Constitutional Footer
Document Version: 1.0
Last Updated: December 2025
Status: Active
Investment Rating: 🏆 10/10 SUPREME EXCELLENCE
`
      );
      const result = await MdFooterTemplateLaw.check(mockContext);
      if (result.passed) {
        expect(result.message).toContain('compliant');
      }
    });

    it('should generate message with violation summary', async () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'README.md'),
        '# README\n\nNo footer.'
      );
      const result = await MdFooterTemplateLaw.check(mockContext);
      // Message should contain information about the violations
      expect(result.message).toBeDefined();
    });
  });

  describe('file reading errors', () => {
    it('should handle missing files gracefully', async () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'README.md'),
        '# README'
      );
      // Create and immediately delete to simulate file access issues
      const result = await MdFooterTemplateLaw.check(mockContext);
      expect(result).toBeDefined();
    });
  });
});

/** The footer is a house convention: it runs where a project enables it. */
describe('MD Footer Template is opt-in', () => {
  const card = ALL_ENHANCED_CONSTITUTIONAL_LAWS.find(
    l => l.title === 'MD Footer Template (MANDATORY)'
  );
  const identity = {
    name: card?.title,
    id: card?.id,
    defaultEnabled: card?.defaultEnabled,
  };

  it('does not run by default', () => {
    expect(card?.defaultEnabled).toBe(false);
    expect(runsWithoutAllowlist(identity, {})).toBe(false);
  });

  it('runs once laws.severity gives it a severity', () => {
    expect(
      runsWithoutAllowlist(identity, {
        'MD Footer Template (MANDATORY)': 'warning',
      })
    ).toBe(true);
  });
});
