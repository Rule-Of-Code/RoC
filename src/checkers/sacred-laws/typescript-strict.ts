/**
 * TypeScript Strict Law
 * All TypeScript must be configured with strict settings
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { ProjectTypeDetector } from '../../utils/config/project-type-detector';
import { SacredLawBase } from './sacred-law-base';
import { PathOperations } from '../../utils/path-operations';
import { loadTypeScript } from '../../utils/react/tsx-source';

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
      this.validateCompilerOptions(compilerOptions, violations, projectRoot);
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

  /** The options `strict: true` switches on (TypeScript's own list). */
  private static readonly IMPLIED_BY_STRICT = new Set([
    'noImplicitAny',
    'noImplicitThis',
    'alwaysStrict',
    'strictNullChecks',
    'strictFunctionTypes',
    'strictBindCallApply',
    'strictPropertyInitialization',
    'useUnknownInCatchVariables',
  ]);

  /**
   * tsconfig.json's compiler options as TypeScript resolves them (`extends`
   * chain merged); null when typescript cannot be loaded or the file does not
   * parse — the caller then reads the options as written.
   */
  private static resolvedFlags(
    projectRoot: string
  ): Record<string, unknown> | null {
    const ts = loadTypeScript(projectRoot);
    if (!ts) return null;
    const file = PathOperations.join(projectRoot, 'tsconfig.json');
    const read = ts.readConfigFile(file, ts.sys.readFile);
    if (read.error) return null;
    const host = { ...ts.sys, readDirectory: (): string[] => [] };
    const parsed = ts.parseJsonConfigFileContent(
      read.config,
      host,
      projectRoot,
      undefined,
      file
    );
    return parsed.options as Record<string, unknown>;
  }

  private static validateCompilerOptions(
    compilerOptions: Record<string, unknown>,
    violations: string[],
    projectRoot: string
  ): void {
    // The flags as the compiler resolves them — `extends` followed (an Nx
    // tsconfig.base.json, @tsconfig/strictest) — or, without a loadable
    // typescript, as written.
    const flags = this.resolvedFlags(projectRoot) ?? compilerOptions;

    // Strict mode checks
    if (flags.strict !== true) {
      violations.push('TypeScript strict mode must be enabled');
    }

    // Additional strict checks. `strict: true` turns on noImplicitAny and
    // noImplicitThis (and the strict* family): demanding them again failed a
    // 3-line project that had `"strict": true` (B4). Only an explicit `false`
    // switches one back off.
    for (const [check, required] of Object.entries(this.STRICT_CHECKS)) {
      const impliedByStrict =
        this.IMPLIED_BY_STRICT.has(check) &&
        flags.strict === true &&
        flags[check] !== false;
      if (flags[check] !== required && !impliedByStrict) {
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
    // `node` is the LEGACY CommonJS algorithm (renamed `node10` in TS 5.0).
    // Demanding it made the law actively harmful on any bundler-based project:
    // Angular 17+ built with esbuild needs `bundler`, and setting `node` to
    // satisfy an audit would change how modules resolve in the real build. The
    // modern modes are the correct answer, not the violation.
    const MODERN_RESOLUTIONS = ['bundler', 'node16', 'nodenext', 'node'];
    const resolution = String(
      compilerOptions.moduleResolution ?? ''
    ).toLowerCase();
    if (!MODERN_RESOLUTIONS.includes(resolution)) {
      violations.push(
        `TypeScript moduleResolution must be one of: ${MODERN_RESOLUTIONS.join(', ')}`
      );
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
