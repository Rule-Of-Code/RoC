/**
 * TypeScript Strict Law
 * All TypeScript must be configured with strict settings
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { ProjectTypeDetector } from '../../utils/config/project-type-detector';
import { SacredLawBase } from './sacred-law-base';

export class TypeScriptStrictLaw {
  private static readonly STRICT_CHECKS = {
    noImplicitAny: true,
    noImplicitReturns: true,
    noImplicitThis: true,
    noUnusedLocals: true,
    noUnusedParameters: true,
    exactOptionalPropertyTypes: true,
    noImplicitOverride: true,
    noPropertyAccessFromIndexSignature: true,
    noUncheckedIndexedAccess: true,
  };

  static check(context: LawCheckContext): LawResult {
    const { projectRoot } = context;
    const violations: string[] = [];

    // Check for TypeScript configuration
    if (!ProjectTypeDetector.hasTypeScriptConfig(projectRoot)) {
      violations.push('TypeScript configuration file missing');
      return SacredLawBase.createResult(
        violations,
        'TypeScript Strict Mode',
        'SACRED_LAW',
        ['Create tsconfig.json with strict configuration']
      );
    }

    const tsConfig = ProjectTypeDetector.getTypeScriptConfig(projectRoot);
    if (tsConfig) {
      const compilerOptions = ((tsConfig as Record<string, unknown>)
        .compilerOptions ?? {}) as Record<string, unknown>;
      this.validateCompilerOptions(compilerOptions, violations);
    } else {
      // The file EXISTS (checked above) but did not parse. Fail closed: a strict
      // gate that cannot read the config it governs must not report compliance —
      // silently passing an unreadable tsconfig is how this law waved a JSONC
      // config through without ever checking a single strict flag.
      violations.push(
        'tsconfig.json exists but could not be parsed — strict settings cannot be verified'
      );
    }

    return SacredLawBase.createResult(
      violations,
      'TypeScript Strict Mode',
      'SACRED_LAW',
      [
        'Enable strict mode in tsconfig.json',
        'Configure all strict compiler options',
        'Set target to ES2020 or higher',
        'Enable source maps for debugging',
      ]
    );
  }

  private static validateCompilerOptions(
    compilerOptions: Record<string, unknown>,
    violations: string[]
  ): void {
    // Strict mode checks
    if (!compilerOptions.strict) {
      violations.push('TypeScript strict mode must be enabled');
    }

    // Additional strict checks
    for (const [check, required] of Object.entries(this.STRICT_CHECKS)) {
      if (compilerOptions[check] !== required) {
        violations.push(`TypeScript ${check} must be ${required}`);
      }
    }

    this.validateTargetVersion(compilerOptions, violations);
    this.validateModuleResolution(compilerOptions, violations);
    this.validateSourceMaps(compilerOptions, violations);
  }

  private static validateTargetVersion(
    compilerOptions: Record<string, unknown>,
    violations: string[]
  ): void {
    const targetValue = compilerOptions.target;
    const target =
      typeof targetValue === 'string' ? targetValue.toLowerCase() : undefined;
    if (!target || target === 'es5' || target === 'es3') {
      violations.push('TypeScript target must be ES2020 or higher');
    }
  }

  private static validateModuleResolution(
    compilerOptions: Record<string, unknown>,
    violations: string[]
  ): void {
    if (compilerOptions.moduleResolution !== 'node') {
      violations.push('TypeScript moduleResolution must be "node"');
    }
  }

  private static validateSourceMaps(
    compilerOptions: Record<string, unknown>,
    violations: string[]
  ): void {
    if (!compilerOptions.sourceMap && !compilerOptions.inlineSourceMap) {
      violations.push('TypeScript source maps must be enabled');
    }
  }
}
