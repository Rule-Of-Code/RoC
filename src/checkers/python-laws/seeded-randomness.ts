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

  /**
   * Randomness that SHOULD be reproducible. A run that cannot be repeated is a
   * bug that appeared once and will not appear again — this is what the law is
   * after, and seeding it is the answer.
   */
  private static readonly SEEDABLE_RANDOMNESS =
    /\brandom\.(random|randint|randrange|choice|choices|shuffle|sample|uniform|gauss)\s*\(/;

  /**
   * Randomness that must NOT be reproducible.
   *
   * `uuid4`, `secrets` and `os.urandom` are chosen precisely because their
   * output cannot be predicted — an identifier that travels in a share URL, an
   * invite code, a token. Seeding one of these is not a testability improvement,
   * it is a security defect, and a sequential replacement leaks how many records
   * exist and lets anyone walk the collection.
   *
   * These are still worth injecting, for a different reason: a test needs to
   * substitute a STUB factory, not a seeded generator. So the finding is kept
   * and the advice is separated — the old message told a project to seed the
   * source of its public identifiers.
   */
  private static readonly UNPREDICTABLE_BY_DESIGN =
    /\buuid\.uuid4\s*\(|\bsecrets\.\w+\s*\(|\bos\.urandom\s*\(|\brandom\.SystemRandom\s*\(/;

  /** Ambient randomness calls in one inner-layer file, with line numbers. */
  private static collectAmbientRandomness(
    raw: string,
    rel: string,
    layer: string,
    violations: string[]
  ): void {
    const lines = this.stripPython(raw).split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? '';

      // Checked first: a line calling both is answering the unpredictability
      // requirement, and telling it to seed would be the wrong advice.
      if (this.UNPREDICTABLE_BY_DESIGN.test(line)) {
        violations.push(
          `${rel}:${i + 1}: ${layer} layer mints unpredictable values inline — inject an id/token factory so a test can substitute a stub. Do NOT seed this source, and do not replace it with a counter: its unpredictability is the point. If this file IS the factory, declare it in thresholds.python.randomnessBoundary.`
        );
        continue;
      }

      if (this.SEEDABLE_RANDOMNESS.test(line)) {
        violations.push(
          `${rel}:${i + 1}: ${layer} layer uses ambient randomness — inject a seedable generator instead, so a run can be reproduced`
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
        'Inject a seedable generator for randomness that should be reproducible',
        'Inject an id/token factory for values that must stay unpredictable — a test substitutes a stub, it does not seed the source',
        'Declare the module that OWNS randomness in thresholds.python.randomnessBoundary — a cryptographic source at a declared boundary is a correct answer, not debt',
      ],
      context
    );
  }
}
