/**
 * Settings Via Pydantic BaseSettings
 * Configuration should be read once, validated and typed in a Pydantic
 * BaseSettings (the config equivalent of typed DTOs), not via os.getenv /
 * os.environ scattered across the codebase. Scattered env access is untyped,
 * unvalidated, and hard to override in tests. Reading env is allowed in the
 * dedicated settings/config module.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { PythonLawBase } from './python-law-base';

export class SettingsViaBaseSettingsLaw extends PythonLawBase {
  private static readonly LAW_NAME = 'Settings Via BaseSettings';
  private static readonly ENV_ACCESS =
    /\bos\.getenv\s*\(|\bos\.environ\b/;
  // The legitimate home for env access — a settings/config module.
  private static readonly CONFIG_FILE =
    /(^|[\\/])(settings|config|configuration)(s)?\.py$|(^|[\\/])(settings|config)[\\/]/i;

  static check(context: LawCheckContext): LawResult {
    const { projectRoot } = context;
    const early = this.createPythonRequiredResult(
      this.LAW_NAME,
      projectRoot,
      root => this.hasPythonProject(root),
      context
    );
    if (early) return early;

    const violations: string[] = [];

    // envBoundary mode (arch proposal №14): when the consumer declares the
    // composition-root paths that legitimately read env, those paths are the
    // allowlist — no Pydantic BaseSettings required. Turns the "entrypoint
    // reads env + injects = clean-arch" waiver into configuration.
    const envBoundary =
      (context.config.thresholds?.python as { envBoundary?: string[] })
        ?.envBoundary ?? [];

    for (const file of this.getPythonFiles(projectRoot, context.config)) {
      const normalized = file.replace(/\\/g, '/');
      if (this.CONFIG_FILE.test(normalized)) continue; // settings/config module is allowed
      if (
        this.pathMatchesAllowlist(
          PathOperations.getRelative(projectRoot, file),
          envBoundary
        )
      )
        continue; // declared composition root
      const raw = FileUtils.readFileContentSync(file);
      if (!raw) continue;
      const content = this.stripPython(raw);
      if (this.ENV_ACCESS.test(content)) {
        violations.push(
          `${PathOperations.getRelative(projectRoot, file)}: reads environment directly (os.getenv/os.environ) — centralise configuration in a Pydantic BaseSettings and inject it`
        );
      }
    }

    return this.createResult(
      violations,
      this.LAW_NAME,
      'PYTHON_LAW',
      [
        'Define a pydantic_settings.BaseSettings model and read env there once',
        'Inject the settings object instead of calling os.getenv across the codebase',
      ],
      context
    );
  }
}
