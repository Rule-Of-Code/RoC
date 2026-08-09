/**
 * Coverage Threshold Reader
 *
 * One place that answers "what coverage thresholds does this workspace declare?".
 *
 * Two laws asked that question and each answered it with its own text scan; both
 * were wrong in the same monorepo, in two different ways:
 *
 *  1. They joined every candidate config into one blob, anchored on the FIRST
 *     `coverageThreshold` occurrence and read a fixed-size window after it. In an
 *     Nx workspace the root `jest.config.ts` is read first, the per-project configs
 *     follow, and `jest.preset.js` — the file the numbers actually live in — falls
 *     outside the window. Result: "100% coverage thresholds not configured" against
 *     a workspace pinned to 100 for all four metrics.
 *  2. They required the metrics to be inline literals. The idiomatic way to state a
 *     threshold once for eighteen projects is a named constant
 *     (`coverageThreshold: { global: COVERAGE_CONTRACT }`), which no window scan can
 *     follow.
 *
 * So: read each config file on its own, take EVERY `coverageThreshold` block by
 * brace balance rather than by character count, and resolve a same-file constant
 * when the block names one instead of spelling the numbers out.
 */

import { JEST_CONSTANTS } from '../automation-constants';
import { FileUtils } from '../file-utils';
import { NxWorkspace } from '../nx-workspace';

/** Metric name → declared threshold, for one `coverageThreshold` block. */
export type CoverageThresholdBlock = Partial<Record<string, number>>;

export class CoverageThresholdReader {
  /**
   * Every file that may declare Jest coverage thresholds. `jest.preset.js` is here
   * because Nx puts the shared settings in a preset that each project `preset:`s —
   * reading only the config that named it is reading a file that mentions Jest, not
   * Jest's configuration.
   */
  static readonly CONFIG_FILES = [
    'jest.config.js',
    'jest.config.ts',
    'jest.config.mjs',
    'jest.config.cjs',
    'jest.config.json',
    'jest.preset.js',
    'jest.preset.ts',
    'package.json',
  ] as const;

  /** Absolute paths of every threshold-bearing config across the workspace. */
  static configPaths(projectRoot: string): string[] {
    const paths = this.CONFIG_FILES.flatMap(file =>
      NxWorkspace.resolveSourceFiles(projectRoot, file)
    );
    return [...new Set(paths)];
  }

  /**
   * One entry per `coverageThreshold` block found anywhere in the workspace.
   * Empty array means no block was found — which is a different answer from
   * "found a block whose numbers are below target", and the callers need both.
   */
  static workspaceBlocks(projectRoot: string): CoverageThresholdBlock[] {
    return this.configPaths(projectRoot).flatMap(path => {
      const content = FileUtils.readFileContentSync(path) ?? '';
      return this.blocksFromContent(content);
    });
  }

  /** Every `coverageThreshold` block declared in one file's text. */
  static blocksFromContent(content: string): CoverageThresholdBlock[] {
    const blocks: CoverageThresholdBlock[] = [];

    let from = 0;
    for (;;) {
      const idx = content.indexOf(JEST_CONSTANTS.COVERAGE_THRESHOLD, from);
      if (idx === -1) break;
      from = idx + JEST_CONSTANTS.COVERAGE_THRESHOLD.length;

      const region = this.bracedValue(content, from);
      if (region === null) continue;

      const metrics = this.readMetrics(this.resolveReferences(region, content));
      if (Object.keys(metrics).length > 0) {
        blocks.push(metrics);
      }
    }

    return blocks;
  }

  /**
   * The lowest value declared for each metric anywhere in the workspace.
   *
   * When eighteen projects state a threshold, the weakest one is what the workspace
   * actually guarantees — reporting the first or the highest would flatter it.
   */
  static lowestThresholds(projectRoot: string): CoverageThresholdBlock {
    const merged: CoverageThresholdBlock = {};

    for (const block of this.workspaceBlocks(projectRoot)) {
      for (const [metric, value] of Object.entries(block)) {
        if (value === undefined) continue;
        const seen = merged[metric];
        merged[metric] = seen === undefined ? value : Math.min(seen, value);
      }
    }

    return merged;
  }

  /**
   * Does the workspace mandate `target` for every coverage metric?
   *
   * Requires a block that pins all four metrics at the target AND no block anywhere
   * that sets a metric below it — a law named "100% coverage mandate" must not pass
   * because one project reached 100 while another quietly sits at 60.
   */
  static mandatesAll(projectRoot: string, target: number): boolean {
    const blocks = this.workspaceBlocks(projectRoot);
    if (blocks.length === 0) return false;

    const metrics = JEST_CONSTANTS.COVERAGE_METRICS;
    const anyBelowTarget = blocks.some(block =>
      metrics.some(metric => {
        const value = block[metric];
        return value !== undefined && value < target;
      })
    );
    if (anyBelowTarget) return false;

    return blocks.some(block =>
      metrics.every(metric => block[metric] === target)
    );
  }

  /**
   * The `{ ... }` value that follows position `from`, delimited by brace balance
   * rather than by a character budget. A window big enough for one config is too
   * small for the next; counting braces is right at any size.
   */
  private static bracedValue(content: string, from: number): string | null {
    const open = content.indexOf('{', from);
    if (open === -1) return null;

    // Only accept a brace that belongs to THIS key: anything between the key and
    // the brace must be the separator, not another statement. The optional
    // closing quote is how the key appears in package.json — `"coverageThreshold":`
    // — where the search lands inside the quotes.
    if (!/^["']?\s*:?\s*$/.test(content.slice(from, open))) return null;

    let depth = 0;
    for (let i = open; i < content.length; i++) {
      if (content[i] === '{') depth++;
      else if (content[i] === '}') {
        depth--;
        if (depth === 0) return content.slice(open, i + 1);
      }
    }

    return null;
  }

  /**
   * Inline the object literals of any constants the block refers to by name.
   *
   * `coverageThreshold: { global: COVERAGE_CONTRACT }` states the thresholds as
   * plainly as an inline literal does — it just states them once instead of
   * eighteen times, which is the reason to write it that way.
   */
  private static resolveReferences(
    region: string,
    content: string,
    depth = 0
  ): string {
    if (depth >= 3) return region;

    const references = new Set(
      [...region.matchAll(/:\s*([A-Za-z_$][\w$]*)\s*[,}\n]/g)]
        .map(match => match[1])
        .filter(name => name !== undefined && !/^(?:true|false|null)$/.test(name))
    );
    if (references.size === 0) return region;

    let expanded = region;
    for (const name of references) {
      const declaration = new RegExp(
        `\\b(?:const|let|var)\\s+${name}\\b[^=]*=`
      ).exec(content);
      if (!declaration) continue;

      const value = this.bracedValue(
        content,
        declaration.index + declaration[0].length
      );
      if (value === null) continue;

      expanded += `\n${this.resolveReferences(value, content, depth + 1)}`;
    }

    return expanded;
  }

  /** Metric values declared in a (reference-expanded) threshold block. */
  private static readMetrics(region: string): CoverageThresholdBlock {
    const metrics: CoverageThresholdBlock = {};

    for (const metric of JEST_CONSTANTS.COVERAGE_METRICS) {
      const match = new RegExp(
        `["']?${metric}["']?\\s*:\\s*(-?\\d{1,3})\\b`
      ).exec(region);
      if (match?.[1] !== undefined) {
        metrics[metric] = Number(match[1]);
      }
    }

    return metrics;
  }
}