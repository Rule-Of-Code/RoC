import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
// Interfaces for strategic document analysis
interface DocumentAnalysis {
  hasDocument: boolean;
  quality: 'basic' | 'comprehensive' | 'good' | 'minimal' | 'none';
  lastUpdated?: Date;
  violations: string[];
  suggestions: string[];
}

interface ReadmeAnalysis {
  hasReadme: boolean;
  quality: string;
  lastModified: Date | null;
}

interface ProjectStatusAnalysis {
  hasProjectStatus: boolean;
  quality: string;
  lastModified: Date | null;
}

interface ChangelogAnalysis {
  hasChangelog: boolean;
  quality: string;
  lastModified: Date | null;
}

/**
 * Strategic Document Updates Law
 *
 * Validates strategic documentation is kept current and updated regularly:
 * - README.md exists and is comprehensive
 * - PROJECT_STATUS.md exists and is current
 * - CHANGELOG.md exists and is maintained
 * - Documentation freshness and recency
 * - Strategic documents completeness
 * - Version alignment with project status
 * - Sprint-based update tracking
 * - Documentation consistency across strategic files
 *
 * Professional implementation following documentation maintenance best practices
 */
export class StrategicDocumentUpdatesLaw {
  private static readonly PROJECT_STATUS_FILE = 'PROJECT_STATUS.md';
  private static readonly CHANGELOG_FILE = 'CHANGELOG.md';

  static async check(context: LawCheckContext): Promise<LawResult> {
    const violations: string[] = [];
    const suggestions: string[] = [];
    let score = 100;
    const { projectRoot } = context;

    // 1. Check for README.md existence and quality
    const readmeAnalysis = this.analyzeReadmeDocument(projectRoot);
    if (!readmeAnalysis.hasReadme) {
      violations.push('Missing README.md file');
      suggestions.push(
        'Create comprehensive README.md with project overview, setup, and usage instructions'
      );
      score -= 30;
    } else if (readmeAnalysis.quality === 'basic') {
      suggestions.push(
        'Enhance README.md with more detailed sections (installation, usage, contributing)'
      );
      score -= 10;
    }

    // 2. Check for PROJECT_STATUS.md
    const projectStatusAnalysis =
      this.analyzeProjectStatusDocument(projectRoot);
    if (!projectStatusAnalysis.hasProjectStatus) {
      violations.push('Missing PROJECT_STATUS.md file');
      suggestions.push(
        'Create PROJECT_STATUS.md to track project milestones and current status'
      );
      score -= 25;
    }

    // 3. Check for CHANGELOG.md
    const changelogAnalysis = this.analyzeChangelogDocument(projectRoot);
    if (!changelogAnalysis.hasChangelog) {
      violations.push('Missing CHANGELOG.md file');
      suggestions.push(
        'Create CHANGELOG.md to track version changes and releases'
      );
      score -= 20;
    }

    // 4. Check document freshness
    const freshnessAnalysis = this.analyzeDocumentFreshness(projectRoot);
    if (!freshnessAnalysis.documentsAreFresh) {
      suggestions.push(
        'Update strategic documents - some appear to be outdated'
      );
      score -= 15;
    }

    // 5. Check for version consistency
    const versionConsistency = this.analyzeVersionConsistency(projectRoot);
    if (!versionConsistency.isConsistent) {
      suggestions.push(
        'Ensure version numbers are consistent across all strategic documents'
      );
      score -= 10;
    }

    // The verdict is violations-driven; the score is informational.
    //
    // It used to be `finalScore >= 100`, but a "basic" README (-10), a stale
    // mtime (-15) and a version mismatch (-10) each deduct score while pushing
    // only a SUGGESTION. So a project with every strategic document present
    // failed the law at score 90 while generateMessage — which reads
    // violations.length — printed a green line. A verdict that contradicts its
    // own message is worse than either answer alone: it fails you for something
    // it only advised, and tells you that you passed while doing it.
    const finalScore = Math.max(0, score);

    return Promise.resolve({
      passed: violations.length === 0,
      message: this.generateMessage(
        violations.length,
        {
          ...readmeAnalysis,
          hasDocument: readmeAnalysis.hasReadme,
          violations: [],
          suggestions: [],
        } as DocumentAnalysis,
        {
          ...projectStatusAnalysis,
          hasDocument: projectStatusAnalysis.hasProjectStatus,
          violations: [],
          suggestions: [],
        } as DocumentAnalysis,
        {
          ...changelogAnalysis,
          hasDocument: changelogAnalysis.hasChangelog,
          violations: [],
          suggestions: [],
        } as DocumentAnalysis
      ),
      details: [...violations, ...suggestions],
      violations,
      suggestions,
      score: finalScore,
      fixable: true,
      config: context.config,
    });
  }

  private static analyzeReadmeDocument(projectRoot: string): ReadmeAnalysis {
    const readmePath = PathOperations.join(projectRoot, 'README.md');
    let hasReadme = false;
    let quality = 'none';
    let lastModified = null;

    if (FileUtils.exists(readmePath)) {
      hasReadme = true;
      try {
        const stats = FileUtils.getFileStats(readmePath);
        lastModified = stats?.mtime ?? new Date(0);

        const content = FileUtils.readFile(readmePath, { encoding: 'utf8' });
        quality = this.assessReadmeQuality(content);
      } catch (_error) {
        quality = 'basic';
      }
    }

    return {
      hasReadme,
      quality,
      lastModified,
    };
  }

  private static analyzeProjectStatusDocument(
    projectRoot: string
  ): ProjectStatusAnalysis {
    const statusPaths = [
      this.PROJECT_STATUS_FILE,
      'docs/PROJECT_STATUS.md',
      'STATUS.md',
      'docs/STATUS.md',
      'ROADMAP.md',
      'docs/ROADMAP.md',
    ];

    let hasProjectStatus = false;
    let quality = 'none';
    let lastModified = null;

    for (const statusPath of statusPaths) {
      const fullPath = PathOperations.join(projectRoot, statusPath);
      if (FileUtils.exists(fullPath)) {
        hasProjectStatus = true;
        try {
          const stats = FileUtils.getFileStats(fullPath);
          lastModified = stats?.mtime ?? new Date(0);

          const content = FileUtils.readFile(fullPath, { encoding: 'utf8' });
          quality = this.assessProjectStatusQuality(content);
        } catch (_error) {
          quality = 'basic';
        }
        break;
      }
    }

    return {
      hasProjectStatus,
      quality,
      lastModified,
    };
  }

  private static analyzeChangelogDocument(
    projectRoot: string
  ): ChangelogAnalysis {
    const changelogPaths = [
      this.CHANGELOG_FILE,
      'docs/CHANGELOG.md',
      'HISTORY.md',
      'docs/HISTORY.md',
      'RELEASES.md',
      'docs/RELEASES.md',
    ];

    let hasChangelog = false;
    let quality = 'none';
    let lastModified = null;

    for (const changelogPath of changelogPaths) {
      const fullPath = PathOperations.join(projectRoot, changelogPath);
      if (FileUtils.exists(fullPath)) {
        hasChangelog = true;
        try {
          const stats = FileUtils.getFileStats(fullPath);
          lastModified = stats?.mtime ?? new Date(0);

          const content = FileUtils.readFile(fullPath, { encoding: 'utf8' });
          quality = this.assessChangelogQuality(content);
        } catch (_error) {
          quality = 'basic';
        }
        break;
      }
    }

    return {
      hasChangelog,
      quality,
      lastModified,
    };
  }

  private static analyzeDocumentFreshness(projectRoot: string): {
    documentsAreFresh: boolean;
    staleFiles: string[];
  } {
    const strategicFiles = [
      'README.md',
      this.PROJECT_STATUS_FILE,
      this.CHANGELOG_FILE,
      'docs/PROJECT_STATUS.md',
      'docs/CHANGELOG.md',
    ];

    let documentsAreFresh = true;
    const staleFiles: string[] = [];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    for (const file of strategicFiles) {
      const filePath = PathOperations.join(projectRoot, file);
      if (FileUtils.exists(filePath)) {
        if (this.isFileStale(filePath, thirtyDaysAgo, file)) {
          documentsAreFresh = false;
          staleFiles.push(file);
        }
      }
    }

    return { documentsAreFresh, staleFiles };
  }

  private static analyzeVersionConsistency(projectRoot: string): {
    isConsistent: boolean;
    versions: string[];
  } {
    const versionSources = [
      { file: 'package.json', field: 'version' },
      { file: 'README.md', pattern: /version[:\s]+(\d+\.\d+\.\d+)/i },
      { file: this.CHANGELOG_FILE, pattern: /##?\s*\[?(\d+\.\d+\.\d+)\]?/i },
    ];

    const versions = new Set<string>();
    let versionsConsistent = true;

    for (const source of versionSources) {
      const filePath = PathOperations.join(projectRoot, source.file);
      if (FileUtils.exists(filePath)) {
        try {
          const content = FileUtils.readFile(filePath, { encoding: 'utf8' });
          this.extractVersionFromSource(content, source, versions);
        } catch (_error) {
          // Skip files that can't be read or parsed
        }
      }
    }

    versionsConsistent = versions.size <= 1;

    return { isConsistent: versionsConsistent, versions: Array.from(versions) };
  }

  private static assessReadmeQuality(content: string): string {
    const qualityIndicators = [
      /## installation/i,
      /## usage/i,
      /## contributing/i,
      /## license/i,
      /## getting started/i,
      /## requirements/i,
      /## api/i,
      /## examples/i,
    ];

    return this.assessQualityByPatterns(content, qualityIndicators);
  }

  private static assessProjectStatusQuality(content: string): string {
    const qualityIndicators = [
      /milestone/i,
      /sprint/i,
      /progress/i,
      /status/i,
      /roadmap/i,
      /timeline/i,
      /completed/i,
      /in progress/i,
    ];

    return this.assessQualityByPatterns(content, qualityIndicators);
  }

  private static assessChangelogQuality(content: string): string {
    const qualityIndicators = [
      /## \[?\d+\.\d+\.\d+\]?/i, // Version headers
      /### added/i,
      /### changed/i,
      /### fixed/i,
      /### removed/i,
      /### deprecated/i,
      /### security/i,
      /unreleased/i,
    ];

    return this.assessQualityByPatterns(content, qualityIndicators);
  }

  /**
   * Generic quality assessment helper
   * Consolidates duplicate quality evaluation pattern
   */
  private static assessQualityByPatterns(
    content: string,
    patterns: RegExp[]
  ): string {
    const matches = patterns.filter(pattern => pattern.test(content)).length;

    if (matches >= 5) return 'comprehensive';
    if (matches >= 3) return 'good';
    if (matches >= 1) return 'basic';
    return 'minimal';
  }

  private static assessReadmeQualityOld(content: string): string {
    const qualityIndicators = [
      /## installation/i,
      /## usage/i,
      /## contributing/i,
      /## license/i,
      /## getting started/i,
      /## requirements/i,
      /## api/i,
      /## examples/i,
    ];

    const matches = qualityIndicators.filter(pattern =>
      pattern.test(content)
    ).length;

    if (matches >= 5) return 'comprehensive';
    if (matches >= 3) return 'good';
    if (matches >= 1) return 'basic';
    return 'minimal';
  }

  private static generateMessage(
    violationCount: number,
    readme: DocumentAnalysis,
    projectStatus: DocumentAnalysis,
    changelog: DocumentAnalysis
  ): string {
    if (violationCount === 0) {
      const qualities = [
        readme.quality,
        projectStatus.quality,
        changelog.quality,
      ].filter(q => q !== 'none');
      const avgQuality = qualities.length > 0 ? 'maintained' : 'basic';
      return `✅ Strategic Documents: ${avgQuality} documentation`;
    }

    const missingDocs = [];
    if (!readme.hasDocument) missingDocs.push('README.md');
    if (!projectStatus.hasDocument) missingDocs.push(this.PROJECT_STATUS_FILE);
    if (!changelog.hasDocument) missingDocs.push(this.CHANGELOG_FILE);

    return `⚠️ Strategic Documents: Missing ${missingDocs.join(', ')}`;
  }

  /**
   * Extract version information from source content
   */
  private static extractVersionFromSource(
    content: string,
    source: { field?: string; pattern?: RegExp },
    versions: Set<string>
  ): void {
    if (source.field) {
      // JSON parsing for package.json
      const json = JSON.parse(content);
      if (json[source.field]) {
        versions.add(json[source.field]);
      }
    } else if (source.pattern) {
      // Regex matching for markdown files
      const match = content.match(source.pattern);
      if (match?.[1]) {
        versions.add(match[1]);
      }
    }
  }

  private static isFileStale(
    filePath: string,
    threshold: Date,
    _fileName: string
  ): boolean {
    try {
      const stats = FileUtils.getFileStats(filePath);
      return (stats?.mtime ?? new Date(0)) < threshold;
    } catch {
      return false; // File doesn't exist or can't be read
    }
  }
}
