/**
 * TypeScript Strict Law
 * All TypeScript must be configured with strict settings
 */

import fs from 'fs';
import path from 'path';

import { PARTLY_READ_TEXT } from '../../utils/judged-nothing';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { ProjectTypeDetector } from '../../utils/config/project-type-detector';
import { FileSystemOperations } from '../../utils/file-system-operations';
import { SacredLawBase } from './sacred-law-base';
import { PathOperations } from '../../utils/path-operations';
import { loadTypeScript } from '../../utils/react/tsx-source';

const TSCONFIG = 'tsconfig.json';

const isFile = (file: string): boolean => {
  try {
    return fs.statSync(file).isFile();
  } catch {
    return false;
  }
};

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
      // The extends chain read as JSONC, merged base → child — with or without
      // the compiler. Without typescript the law used to read tsconfig.json
      // alone and report every flag set in the base as "must be enabled":
      // false findings, and no note (#427, QA p478-tsstrict-extends).
      const chain = this.extendsChain(
        PathOperations.join(projectRoot, TSCONFIG)
      );
      this.validateCompilerOptions(chain, violations, projectRoot);
      if (chain.unread.length > 0) {
        violations.push(
          `tsconfig.json extends ${chain.unread.map(e => JSON.stringify(e)).join(', ')}, which could not be read — the inherited compiler options were NOT read, and a flag not set in the files that were read is not judged; ${PARTLY_READ_TEXT}`
        );
      }
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
    const file = PathOperations.join(projectRoot, TSCONFIG);
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

  /**
   * The compiler options of `file` with its `extends` chain merged (base
   * first, later entries of an `extends` array over earlier ones, the file's
   * own options last), read as JSONC. `unread` names every link that could
   * not be found or parsed: options it may set are unknown.
   */
  private static extendsChain(
    file: string,
    seen: Set<string> = new Set()
  ): { options: Record<string, unknown>; unread: string[] } {
    const config = FileSystemOperations.readJsoncFile(file) as Record<
      string,
      unknown
    >;
    seen.add(file);
    let options: Record<string, unknown> = {};
    const unread: string[] = [];
    const links = ([] as unknown[]).concat(config.extends ?? []);
    for (const link of links) {
      if (typeof link !== 'string') continue;
      const base = this.resolveExtends(path.dirname(file), link);
      if (!base || seen.has(base)) {
        if (!base) unread.push(link);
        continue;
      }
      try {
        const inherited = this.extendsChain(base, seen);
        options = { ...options, ...inherited.options };
        unread.push(...inherited.unread);
      } catch {
        unread.push(link);
      }
    }
    const own = (config.compilerOptions ?? {}) as Record<string, unknown>;
    return { options: { ...options, ...own }, unread };
  }

  /** An `extends` entry as a file: a relative path, or a package in node_modules. */
  private static resolveExtends(dir: string, link: string): string | null {
    const candidates = (base: string): string[] =>
      base.endsWith('.json')
        ? [base]
        : [base, `${base}.json`, path.join(base, TSCONFIG)];
    if (link.startsWith('.') || path.isAbsolute(link)) {
      return candidates(path.resolve(dir, link)).find(isFile) ?? null;
    }
    for (let at = dir; ; at = path.dirname(at)) {
      const found = candidates(path.join(at, 'node_modules', link)).find(
        isFile
      );
      if (found) return found;
      if (path.dirname(at) === at) return null;
    }
  }

  private static validateCompilerOptions(
    chain: { options: Record<string, unknown>; unread: string[] },
    violations: string[],
    projectRoot: string
  ): void {
    const compilerOptions = chain.options;
    // The flags as the compiler resolves them — `extends` followed (an Nx
    // tsconfig.base.json, @tsconfig/strictest) — or, without a loadable
    // typescript, as the JSONC chain sets them.
    const flags = this.resolvedFlags(projectRoot) ?? compilerOptions;
    // A link of the chain that was not read may set any flag the read files
    // leave unset: such a flag is not judged (the note says so).
    const unknown = (flag: string): boolean =>
      chain.unread.length > 0 && compilerOptions[flag] === undefined;

    // Strict mode checks
    if (flags.strict !== true && !unknown('strict')) {
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
      if (flags[check] !== required && !impliedByStrict && !unknown(check)) {
        violations.push(`TypeScript ${check} must be ${required}`);
      }
    }

    // target / moduleResolution / sourceMap as the chain sets them (strings,
    // unlike the compiler's resolved enums) — inherited ones included.
    if (!unknown('target'))
      this.validateTargetVersion(compilerOptions, violations);
    if (!unknown('moduleResolution'))
      this.validateModuleResolution(compilerOptions, violations);
    if (!unknown('sourceMap') || compilerOptions.inlineSourceMap !== undefined)
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
