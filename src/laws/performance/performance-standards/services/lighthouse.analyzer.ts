import { inspectLighthouseGate } from '../../../../utils/lighthouse-gate';

/**
 * Lighthouse Analyzer
 *
 * Single Responsibility: Analyzing Lighthouse configuration
 */
export class LighthouseAnalyzer {
  /**
   * A gate is something that RUNS. This used to return satisfied as soon as one
   * of four conventional paths existed, testing its contents for the substrings
   * `performance`, `90` or `0.9` — so `echo '{"performance":1}' >
   * .lighthouserc.json` turned this law from a violation into a pass. Eighteen
   * bytes that nothing executes, moving a law towards green, appearing nowhere
   * as a decision anyone made.
   */
  static analyze(projectRoot: string): string[] {
    const violations: string[] = [];
    const gate = inspectLighthouseGate(projectRoot);

    if (!gate.hasConfig && !gate.isWired) {
      violations.push('Lighthouse performance configuration not found');
      return violations;
    }

    if (!gate.isWired) {
      violations.push(
        'Lighthouse configuration exists but nothing runs it — add a script, a CI step, or the dependency, or the file gates nothing'
      );
      return violations;
    }

    if (gate.hasConfig && !gate.declaresThreshold) {
      violations.push(
        'Lighthouse configuration missing performance threshold ≥90'
      );
    }

    return violations;
  }
}
