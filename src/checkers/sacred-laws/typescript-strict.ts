/**
 * TypeScript Strict Law
 * All TypeScript must be configured with strict settings
 */

import { PARTLY_READ_TEXT, withNotRead } from '../../utils/judged-nothing';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { ProjectTypeDetector } from '../../utils/config/project-type-detector';
import { SacredLawBase } from './sacred-law-base';
import { PathOperations } from '../../utils/path-operations';
import { loadTypeScript } from '../../utils/react/tsx-source';
import {
  absentOptionDefaults,
  readTsconfigProjects,
  type TsconfigChain,
  tsconfigFindingWhere,
  type TsconfigProjects,
} from '../../utils/tsconfig-chain';

const TSCONFIG = 'tsconfig.json';

/** The options that are set: an option present as `undefined` is absent. */
function withoutUndefined(
  options: Record<string, unknown>
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(options).filter(([, value]) => value !== undefined)
  );
}

/** The compiler option a finding of this law is about. */
function flagsOf(finding: string): string[] {
  if (finding.startsWith('TypeScript strict mode')) return ['strict'];
  if (finding.startsWith('TypeScript target')) return ['target'];
  if (finding.startsWith('TypeScript moduleResolution'))
    return ['moduleResolution'];
  const flag = /^TypeScript (\w+) must be/.exec(finding)?.[1];
  if (!flag) return [];
  // A flag strict implies is set by whoever set strict, when it is unset;
  // any other flag only by itself (noImplicitReturns is not one strict sets).
  return STRICT_FAMILY.has(flag) ? [flag, 'strict'] : [flag];
}

/** The options `strict: true` switches on (TypeScript's own list). */
const STRICT_FAMILY = new Set([
  'noImplicitAny',
  'noImplicitThis',
  'alwaysStrict',
  'strictNullChecks',
  'strictFunctionTypes',
  'strictBindCallApply',
  'strictPropertyInitialization',
  'useUnknownInCatchVariables',
]);

export class TypeScriptStrictLaw {
  // The flags this law requires. noPropertyAccessFromIndexSignature and
  // sourceMap are not among them: the first is a style choice about how an
  // index signature is read (`obj['key']` vs `obj.key`), not a type-safety
  // guarantee — noUncheckedIndexedAccess is the one that makes the read
  // honest — and source maps are a build/debugging setting, not strictness.
  private static readonly STRICT_CHECKS = {
    noImplicitAny: true,
    noImplicitReturns: true,
    noImplicitThis: true,
    noUnusedLocals: true,
    noUnusedParameters: true,
    exactOptionalPropertyTypes: true,
    noImplicitOverride: true,
    noUncheckedIndexedAccess: true,
  };

  static check(context: LawCheckContext): LawResult {
    const { projectRoot } = context;
    const violations: string[] = [];
    // What could not be read is a note, not a finding (#453).
    const notRead: string[] = [];

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
    // The extends chain read as JSONC, merged base → child — with or without
    // the compiler. Without typescript the law used to read tsconfig.json
    // alone and report every flag set in the base as "must be enabled":
    // false findings, and no note (#427, QA p478-tsstrict-extends). The
    // projects tsconfig.json lists in `references` are judged too, as
    // `tsc -b` builds them (#640).
    const projects = tsConfig
      ? readTsconfigProjects(
          projectRoot,
          PathOperations.join(projectRoot, TSCONFIG)
        )
      : null;
    if (projects) {
      this.judgeProjects(projects, violations, notRead, projectRoot);
    } else {
      // The file EXISTS (checked above) but did not parse. Fail closed: a strict
      // gate that cannot read the config it governs must not report compliance —
      // silently passing an unreadable tsconfig is how this law waved a JSONC
      // config through without ever checking a single strict flag.
      violations.push(
        'tsconfig.json exists but could not be parsed — strict settings cannot be verified'
      );
    }

    const result = SacredLawBase.createResult(
      violations,
      'TypeScript Strict Mode',
      'SACRED_LAW',
      [
        'Enable strict mode in tsconfig.json',
        'Configure all strict compiler options',
        'Set a target newer than ES5',
      ]
    );
    return withNotRead(result, notRead);
  }

  /**
   * Every tsconfig of the build: a finding about a referenced project starts
   * with its file, marked when it is a test config; the root's read as before.
   */
  private static judgeProjects(
    all: TsconfigProjects,
    violations: string[],
    notRead: string[],
    projectRoot: string
  ): void {
    const { projects, notRead: unreadReferences } = all;
    for (const project of projects) {
      const found: string[] = [];
      this.validateCompilerOptions(
        project.chain,
        found,
        projectRoot,
        project.file
      );
      // Each finding once, on the file that set the flag (#640).
      for (const finding of found) {
        const where = tsconfigFindingWhere(all, project, flagsOf(finding));
        const line = `${where}${finding}`;
        if (!violations.includes(line)) violations.push(line);
      }
      const note =
        project.chain.unread.length > 0
          ? this.extendsNote(project.rel, project.chain)
          : null;
      if (note && !notRead.includes(note)) notRead.push(note);
    }
    notRead.push(...unreadReferences);
  }

  /** The note for a tsconfig whose `extends` chain was not read to the end. */
  private static extendsNote(rel: string, chain: TsconfigChain): string {
    return `${rel} extends ${chain.unread.map(e => JSON.stringify(e)).join(', ')}, which could not be read — the inherited compiler options were NOT read, and a flag not set in the files that were read is not judged; ${PARTLY_READ_TEXT}`;
  }

  /** The options `strict: true` switches on (TypeScript's own list). */
  private static readonly IMPLIED_BY_STRICT = STRICT_FAMILY;

  /**
   * A tsconfig's compiler options as TypeScript resolves them (`extends`
   * chain merged); null when typescript cannot be loaded or the file does not
   * parse — the caller then reads the options as written.
   */
  private static resolvedFlags(
    projectRoot: string,
    file: string
  ): Record<string, unknown> | null {
    const ts = loadTypeScript(projectRoot);
    if (!ts) return null;
    const read = ts.readConfigFile(file, ts.sys.readFile);
    if (read.error) return null;
    const host = { ...ts.sys, readDirectory: (): string[] => [] };
    const parsed = ts.parseJsonConfigFileContent(
      read.config,
      host,
      PathOperations.getDirectory(file),
      undefined,
      file
    );
    return parsed.options as Record<string, unknown>;
  }

  private static validateCompilerOptions(
    chain: { options: Record<string, unknown>; unread: string[] },
    violations: string[],
    projectRoot: string,
    file = PathOperations.join(projectRoot, TSCONFIG)
  ): void {
    const compilerOptions = chain.options;
    // The flags as the compiler resolves them — `extends` followed (an Nx
    // tsconfig.base.json, @tsconfig/strictest) — or, without a loadable
    // typescript, as the JSONC chain sets them.
    // An option the tsconfig leaves out has the default of the TypeScript
    // major the project builds with: from 6.0 on, `strict` is true and
    // `target` is the newest ES version (#667).
    const defaults = absentOptionDefaults(projectRoot);
    const flags = {
      ...defaults,
      ...withoutUndefined(
        this.resolvedFlags(projectRoot, file) ?? compilerOptions
      ),
    };
    // A link of the chain that was not read may set any flag the read files
    // leave unset: such a flag is not judged (the note says so).
    const unknown = (flag: string): boolean =>
      chain.unread.length > 0 && compilerOptions[flag] === undefined;

    // Strict mode checks
    if (flags.strict !== true && !unknown('strict')) {
      violations.push('TypeScript strict mode must be enabled');
    }

    violations.push(...this.strictFlagFindings(flags, unknown));

    // target / moduleResolution as the chain sets them (strings, unlike the
    // compiler's resolved enums) — inherited ones included.
    if (!unknown('target'))
      this.validateTargetVersion(
        { ...defaults, ...withoutUndefined(compilerOptions) },
        violations
      );
    if (!unknown('moduleResolution'))
      this.validateModuleResolution(compilerOptions, violations);
  }

  /**
   * The additional strict checks. `strict: true` turns on noImplicitAny and
   * noImplicitThis (and the strict* family): demanding them again failed a
   * 3-line project that had `"strict": true` (B4). Only an explicit `false`
   * switches one back off. A flag `unknown` says an unread base may set is
   * not judged.
   */
  private static strictFlagFindings(
    flags: Record<string, unknown>,
    unknown: (flag: string) => boolean
  ): string[] {
    return Object.entries(this.STRICT_CHECKS)
      .filter(([check, required]) => {
        const impliedByStrict =
          this.IMPLIED_BY_STRICT.has(check) &&
          flags.strict === true &&
          flags[check] !== false;
        return flags[check] !== required && !impliedByStrict && !unknown(check);
      })
      .map(([check, required]) => `TypeScript ${check} must be ${required}`);
  }

  private static validateTargetVersion(
    compilerOptions: Record<string, unknown>,
    violations: string[]
  ): void {
    const targetValue = compilerOptions.target;
    const target =
      typeof targetValue === 'string' ? targetValue.toLowerCase() : undefined;
    if (!target || target === 'es5' || target === 'es3') {
      violations.push('TypeScript target must be set, and newer than ES5');
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
}
