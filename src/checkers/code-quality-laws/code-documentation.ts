/**
 * Code Documentation Standards — every exported class and function says what
 * it is for.
 *
 * The law judges one thing, per declaration: an exported class or exported
 * function without a JSDoc block is a finding, at its file and line. A file
 * whose ONLY exported class/function is that declaration may document it with
 * a JSDoc block at the top of the file instead — the file and the declaration
 * are then the same unit, and a second block saying the same thing is noise.
 *
 * What is NOT judged: methods, interfaces, types, enums, constants that are
 * not functions, and declarations the file does not export. A non-exported
 * helper is read by the one file that uses it; an exported one is read by
 * everyone who imports it, without the file around it.
 *
 * The files are read as syntax with the project's own TypeScript, not by a
 * regex: an `export class` inside a template string or a comment is not a
 * class, and a docblock is the one the compiler attaches to the declaration —
 * above its decorators, where IDEs and TypeDoc read it, not below them.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { CheckerUtils } from '../../utils/checker-utils';
import { PathOperations } from '../../utils/path-operations';
import { ReactProject } from '../../utils/react/react-project';
import type { TsxSource } from '../../utils/react/tsx-source';
import { CodeQualityLawBase } from './code-quality-law-base';
import { ExportedDeclarations } from './exported-declarations';

export class CodeDocumentationLaw extends CodeQualityLawBase {
  static check(context: LawCheckContext): LawResult {
    const { projectRoot } = context;

    try {
      const files = this.findTypeScriptFiles(projectRoot, context).filter(
        file => !file.endsWith('.d.ts')
      );
      const { sources, unread } = ReactProject.parse(context, files);
      const violations: string[] = [...unread];

      for (const source of sources) {
        violations.push(...this.undocumentedIn(source, projectRoot));
      }

      return this.createResult(
        violations,
        'Code Documentation',
        'CODE_QUALITY_LAW',
        [
          'Add a JSDoc /** */ block above each exported class and function that says what it is for (a file whose only export it is may carry the block at the top of the file instead)',
        ],
        context
      );
    } catch (_error) {
      return this.createResult(
        ['Error analyzing code documentation'],
        'Code Documentation',
        'CODE_QUALITY_LAW',
        [],
        context
      );
    }
  }

  /** The findings for one parsed file: one per exported class/function without JSDoc. */
  private static undocumentedIn(
    source: TsxSource,
    projectRoot: string
  ): string[] {
    const declarations = ExportedDeclarations.of(source);
    if (declarations.length === 0) return [];

    const onlyOne = declarations.length === 1;
    if (onlyOne && ExportedDeclarations.hasFileHeader(source)) return [];

    const relativePath = PathOperations.getRelative(
      projectRoot,
      source.fileName
    );
    return declarations
      .filter(declaration => !declaration.documented)
      .map(
        ({ kind, name, line }) =>
          `${relativePath}:${line}: exported ${kind} ${name} has no JSDoc — add a /** */ block above it that says what it is for${onlyOne ? ' (or at the top of the file: it is the file’s only exported class/function)' : ''}`
      );
  }

  protected static override findTypeScriptFiles(
    projectRoot: string,
    context: LawCheckContext
  ): string[] {
    // The law id is passed so `ignores.byRule` keyed by this law applies.
    return CheckerUtils.findFilesByExtension(
      projectRoot,
      CheckerUtils.getCommonExtensions().TYPESCRIPT,
      context.config,
      context.lawId
    );
  }
}
