/**
 * How Strategic Document Updates reads one strategic document: its quality
 * by the sections and words it carries, the version it states, and whether
 * it has gone stale.
 */
import { FileUtils } from '../../utils/file-utils';

/** How complete a README is, by the sections it has. */
export function assessReadmeQuality(content: string): string {
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

  return assessQualityByPatterns(content, qualityIndicators);
}

/** How complete a project status document is, by the progress words it uses. */
export function assessProjectStatusQuality(content: string): string {
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

  return assessQualityByPatterns(content, qualityIndicators);
}

/** How complete a changelog is, by its version and change-type headers. */
export function assessChangelogQuality(content: string): string {
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

  return assessQualityByPatterns(content, qualityIndicators);
}

/**
 * Generic quality assessment helper
 * Consolidates duplicate quality evaluation pattern
 */
function assessQualityByPatterns(content: string, patterns: RegExp[]): string {
  const matches = patterns.filter(pattern => pattern.test(content)).length;

  if (matches >= 5) return 'comprehensive';
  if (matches >= 3) return 'good';
  if (matches >= 1) return 'basic';
  return 'minimal';
}

/**
 * Extract version information from source content
 */
export function extractVersionFromSource(
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

/** Was the file last modified before the threshold? A file without stats counts as modified at the epoch. */
export function isFileStale(
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
