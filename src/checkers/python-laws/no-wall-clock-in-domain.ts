/**
 * No Wall-Clock In Domain
 * The domain/application layers receive `now` as a parameter; reading the wall
 * clock (datetime.now / time.time / time.monotonic) belongs to the composition
 * root and adapters. Determinism is testability: parity gates and golden
 * fixtures only work when the domain takes an explicit clock.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { PythonLawBase } from './python-law-base';

export class NoWallClockInDomainLaw extends PythonLawBase {
  private static readonly LAW_NAME = 'No Wall-Clock In Domain';
  private static readonly WALL_CLOCK =
    /\bdatetime\.now\s*\(|\bdatetime\.utcnow\s*\(|\btime\.time\s*\(|\btime\.monotonic\s*\(/;

  /** Wall-clock reads in one inner-layer file, with line numbers. */
  private static collectWallClockReads(
    raw: string,
    rel: string,
    layer: string,
    violations: string[]
  ): void {
    const lines = this.stripPython(raw).split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (this.WALL_CLOCK.test(lines[i] ?? '')) {
        violations.push(
          `${rel}:${i + 1}: ${layer} layer reads the wall clock — accept \`now\` as a parameter (clock lives in the composition root/adapters)`
        );
      }
    }
  }

  static check(context: LawCheckContext): LawResult {
    const { projectRoot, config } = context;
    const early = this.createPythonRequiredResult(
      this.LAW_NAME,
      projectRoot,
      root => this.hasPythonProject(root),
      context
    );
    if (early) return early;

    const boundary =
      (config.thresholds?.python as { clockBoundary?: string[] })
        ?.clockBoundary ?? [];
    const violations: string[] = [];

    for (const file of this.getPythonFiles(projectRoot, config)) {
      if (this.isTestFile(file)) continue;
      const layer = this.layerOfPath(file);
      if (layer !== 'domain' && layer !== 'application') continue;
      const rel = PathOperations.getRelative(projectRoot, file);
      if (this.pathMatchesAllowlist(rel, boundary)) continue;
      const raw = FileUtils.readFileContentSync(file);
      if (!raw) continue;
      this.collectWallClockReads(raw, rel, layer, violations);
    }

    return this.createResult(
      violations,
      this.LAW_NAME,
      'PYTHON_LAW',
      [
        'Pass `now` (or a clock port) into domain/application code explicitly',
        'Declare genuine clock modules in thresholds.python.clockBoundary',
      ],
      context
    );
  }
}
