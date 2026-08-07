/**
 * Zero Tolerance Doctrine (Sacred Law)
 * No errors, warnings, or violations of any kind in commits
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileSystemOperations } from '../../utils/file-system-operations';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { SacredLawBase } from './sacred-law-base';

export class ZeroToleranceLaw {
  static check(context: LawCheckContext): LawResult {
    const { projectRoot } = context;
    const violations: string[] = [];

    // Check TypeScript config for strict mode
    const tsConfig = this.getTsConfig(projectRoot);
    const compilerOptions = (tsConfig?.compilerOptions || {}) as Record<
      string,
      unknown
    >;

    if (!tsConfig || !compilerOptions.strict) {
      violations.push('TypeScript strict mode not enabled');
    }
    if (!tsConfig || !compilerOptions.noImplicitAny) {
      violations.push('TypeScript noImplicitAny not enabled');
    }

    // Check for ESLint config
    const hasESLint =
      FileUtils.fileExistsSync(
        PathOperations.join(projectRoot, 'eslint.config.js')
      ) ||
      FileUtils.fileExistsSync(
        PathOperations.join(projectRoot, 'eslint.config.mjs')
      ) ||
      FileUtils.fileExistsSync(
        PathOperations.join(projectRoot, '.eslintrc.js')
      );

    if (!hasESLint) {
      violations.push('ESLint configuration not found');
    }

    return SacredLawBase.createResult(
      violations,
      'Zero Tolerance Doctrine',
      'SACRED_LAW',
      [
        'Enable TypeScript strict mode',
        'Configure ESLint',
        'Fix all errors and warnings',
      ]
    );
  }

  private static getTsConfig(
    projectRoot: string
  ): Record<string, unknown> | null {
    const tsConfigPath = PathOperations.join(projectRoot, 'tsconfig.json');
    if (!FileUtils.fileExistsSync(tsConfigPath)) return null;

    // tsconfig.json is JSONC — a plain JSON.parse threw on comments and reported
    // strict as "not enabled" on a config that had it (a false failure).
    return FileSystemOperations.readJsoncFile<Record<string, unknown> | null>(
      tsConfigPath,
      null
    );
  }
}
