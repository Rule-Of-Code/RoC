/**
 * Seeded Randomness
 * random.* / uuid.uuid4 inside domain/application code breaks golden
 * reproducibility — randomness enters through an injected generator, the same
 * determinism canon as the explicit clock. Advisory rollout (info).
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { PythonLawBase } from './python-law-base';

export class SeededRandomnessLaw extends PythonLawBase {
  private static readonly LAW_NAME = 'Seeded Randomness';
  private static readonly RANDOMNESS =
    /\brandom\.(random|randint|randrange|choice|choices|shuffle|sample|uniform|gauss)\s*\(|\buuid\.uuid4\s*\(/;

  /** Ambient randomness calls in one inner-layer file, with line numbers. */
  private static collectAmbientRandomness(
    raw: string,
    rel: string,
    layer: string,
    violations: string[]
  ): void {
    const lines = this.stripPython(raw).split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (this.RANDOMNESS.test(lines[i] ?? '')) {
        violations.push(
          `${rel}:${i + 1}: ${layer} layer uses ambient randomness — inject a generator/id-factory instead`
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
      (config.thresholds?.python as { randomnessBoundary?: string[] })
        ?.randomnessBoundary ?? [];
    const violations: string[] = [];

    for (const file of this.getPythonFiles(projectRoot, config)) {
      if (this.isTestFile(file)) continue;
      const layer = this.layerOfPath(file);
      if (layer !== 'domain' && layer !== 'application') continue;
      const rel = PathOperations.getRelative(projectRoot, file);
      if (this.pathMatchesAllowlist(rel, boundary)) continue;
      const raw = FileUtils.readFileContentSync(file);
      if (!raw) continue;
      this.collectAmbientRandomness(raw, rel, layer, violations);
    }

    return this.createResult(
      violations,
      this.LAW_NAME,
      'PYTHON_LAW',
      [
        'Inject a random generator / id factory into domain code (seedable in tests)',
        'Declare genuine randomness homes in thresholds.python.randomnessBoundary',
      ],
      context
    );
  }
}
