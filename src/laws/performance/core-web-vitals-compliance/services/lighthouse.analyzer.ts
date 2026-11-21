import { PathOperations } from '../../../../utils/path-operations';
import { inspectLighthouseGate } from '../../../../utils/lighthouse-gate';
import type { LighthouseCheckResult } from '../constants/types';

/**
 * The Lighthouse check of Core Web Vitals Compliance: passes only when a
 * Lighthouse config is actually run by a script or CI (the shared
 * `inspectLighthouseGate` reader), not when a config file merely exists.
 */
export class LighthouseAnalyzerService {
  /**
   * A configuration file that nothing runs is not a Lighthouse gate.
   *
   * This reported `hasConfig` on existence alone, so writing an empty object to
   * `.lighthouserc.json` took this law from 75/100 with a violation to
   * 100/100 PASSED — with no Lighthouse installed, no script referencing the
   * file, and the shipped artefact byte-identical.
   *
   * The wiring is asked for through the same shared reader the sibling law
   * uses, so the two cannot disagree about the same repository.
   */
  static analyze(projectRoot: string): LighthouseCheckResult {
    const gate = inspectLighthouseGate(projectRoot);

    return {
      hasConfig: gate.isWired,
      configFiles: gate.isWired
        ? gate.configFiles.map(rel => PathOperations.getBasename(rel))
        : [],
    };
  }
}
