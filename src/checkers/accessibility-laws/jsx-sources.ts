/**
 * JSX for the accessibility laws: the `.tsx`/`.jsx` files, parsed with the
 * project's own TypeScript (see utils/react/tsx-source).
 *
 * `ts.createSourceFile` never throws: on broken syntax it recovers and hands
 * back a tree in which elements may be missing or mis-nested. A law that read
 * that tree would judge a file it did not really read, so a file with parse
 * diagnostics is reported as not read, like a file the parser never opened.
 */

import type * as TS from 'typescript';
import type { LawCheckContext } from '../../types/law.types';
import { ReactProject } from '../../utils/react/react-project';
import {
  jsxAttribute,
  type JsxElementInfo,
  type TsxSource,
  type TypeScriptModule,
} from '../../utils/react/tsx-source';

/** The extensions JSX is read from. JSX inside `.js` files is not read. */
export const JSX_EXTENSIONS = ['.tsx', '.jsx'] as const;

export interface JsxFile {
  source: TsxSource;
  relative: string;
  elements: JsxElementInfo[];
}

export interface ReadJsx {
  files: JsxFile[];
  /** One message per file (or batch) that was not read; each is a violation. */
  unread: string[];
}

/** Parse diagnostics a TypeScript SourceFile carries (internal, present since TS 1.x). */
export function parseErrors(ts: TypeScriptModule, sourceFile: TS.SourceFile): string[] {
  const diagnostics =
    (sourceFile as unknown as { parseDiagnostics?: readonly TS.Diagnostic[] })
      .parseDiagnostics ?? [];
  return diagnostics.map(diagnostic => {
    const line =
      diagnostic.start === undefined
        ? 0
        : sourceFile.getLineAndCharacterOfPosition(diagnostic.start).line + 1;
    return `line ${line}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')}`;
  });
}

export class JsxSources {
  /** Every non-test `.tsx`/`.jsx` file, parsed; what could not be read is in `unread`. */
  static read(context: LawCheckContext): ReadJsx {
    const paths = ReactProject.sourceFiles(context, JSX_EXTENSIONS);
    const { sources, unread } = ReactProject.parse(context, paths);
    const files: JsxFile[] = [];
    for (const source of sources) {
      const relative = ReactProject.relative(context, source.fileName);
      const errors = parseErrors(source.ts, source.sourceFile);
      if (errors.length > 0) {
        unread.push(`${relative}: could not be parsed (${errors[0]}) — its JSX was NOT read`);
        continue;
      }
      files.push({ source, relative, elements: source.jsxElements() });
    }
    return { files, unread };
  }

  /** A DOM element (`button`, `input`), not a component (`Button`, `motion.div`). */
  static isIntrinsic(element: JsxElementInfo, tag?: string): boolean {
    const intrinsic = /^[a-z][\w-]*$/.test(element.tag);
    return intrinsic && (tag === undefined || element.tag === tag);
  }

  static has(element: JsxElementInfo, name: string): boolean {
    return jsxAttribute(element, name) !== undefined;
  }

  /** The literal value of `name` when it is written as a string, else undefined. */
  static stringValue(element: JsxElementInfo, name: string): string | undefined {
    const attribute = jsxAttribute(element, name);
    return attribute?.kind === 'string' ? attribute.value : undefined;
  }

  /** Tags of the JSX elements that contain `element`, innermost first. */
  static ancestorTags(source: TsxSource, element: JsxElementInfo): string[] {
    const ts = source.ts;
    const tags: string[] = [];
    for (let node: TS.Node | undefined = element.node.parent; node; node = node.parent) {
      if (ts.isJsxElement(node) && node.openingElement !== element.node) {
        tags.push(node.openingElement.tagName.getText(source.sourceFile));
      }
    }
    return tags;
  }

  /** Does the file call `<anything>.<method>(…)`? */
  static callsMethod(source: TsxSource, method: string): boolean {
    const ts = source.ts;
    let found = false;
    source.walk(node => {
      if (
        !found &&
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === method
      ) {
        found = true;
      }
    });
    return found;
  }
}
