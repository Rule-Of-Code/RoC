/**
 * What every runtime React law needs around its judgement: the React sources
 * it reads (an unread file or an empty scan is a violation, never a green),
 * the `file:line` a finding names, and the inline reason — a real comment,
 * not a string in code — that answers a finding the law cannot judge.
 */

import type * as TS from 'typescript';
import type { LawCheckContext } from '../../types/law.types';
import { ReactProject } from './react-project';
import type { TsxSource } from './tsx-source';

const commentsCache = new WeakMap<
  TsxSource,
  Array<{ line: number; text: string }>
>();

/**
 * Every comment of the file with the 1-based line it ends on. Read from the
 * trivia the parser keeps around tokens — `{/* … *\/}` inside JSX included —
 * so a string that looks like a comment is never one.
 */
function comments(source: TsxSource): Array<{ line: number; text: string }> {
  const cached = commentsCache.get(source);
  if (cached) return cached;
  const ts = source.ts;
  const { text, sourceFile } = source;
  const seen = new Map<number, { line: number; text: string }>();
  const collect = (ranges: readonly TS.CommentRange[] | undefined): void => {
    for (const range of ranges ?? []) {
      if (seen.has(range.pos)) continue;
      seen.set(range.pos, {
        line: sourceFile.getLineAndCharacterOfPosition(range.end).line + 1,
        text: text.slice(range.pos, range.end),
      });
    }
  };
  source.walk(node => {
    if (ts.isJsxText(node)) return;
    collect(ts.getLeadingCommentRanges(text, node.pos));
    collect(ts.getTrailingCommentRanges(text, node.end));
    if (ts.isJsxExpression(node) && !node.expression) {
      // `{/* … */}`: the comment follows the brace on the same line, which the
      // compiler reports as trailing trivia, not leading.
      const inside = node.getStart(sourceFile) + 1;
      collect(ts.getTrailingCommentRanges(text, inside));
      collect(ts.getLeadingCommentRanges(text, inside));
    }
  });
  const list = [...seen.values()];
  commentsCache.set(source, list);
  return list;
}

/**
 * True when a comment on `line` or the line above carries `marker: <reason>`
 * with a non-empty reason — the inline answer a finding the law cannot judge
 * (a bounded one-shot timer, a list that never reorders) is given.
 */
export function hasInlineReason(
  source: TsxSource,
  line: number,
  marker: string
): boolean {
  const pattern = new RegExp(`${marker}\\s*:\\s*\\S`);
  return comments(source).some(
    comment =>
      (comment.line === line || comment.line === line - 1) &&
      pattern.test(comment.text)
  );
}

/** `file:line` for a message, relative to the project root. */
export function where(
  context: LawCheckContext,
  source: TsxSource,
  node: TS.Node
): string {
  return `${ReactProject.relative(context, source.fileName)}:${source.lineOf(node)}`;
}

/**
 * Parse the React source a law reads. A file that was not read becomes a
 * violation, and so does a scan that found no React source at all: the law is
 * selected because the project declares React, so an empty scan means
 * `ignores` hid the subject, and a green from it would be a green over nothing.
 */
export function readReactSources(
  context: LawCheckContext,
  lawName: string
): { sources: TsxSource[]; violations: string[] } {
  const files = ReactProject.sourceFiles(context);
  if (files.length === 0) {
    return {
      sources: [],
      violations: [
        `no React source file (.tsx/.jsx/.ts/.js) was found to inspect although the project declares react — ${lawName} does not pass on an empty scan; check that ignores do not hide the source`,
      ],
    };
  }
  const { sources, unread } = ReactProject.parse(context, files);
  return {
    sources,
    violations: unread.map(
      reason => `${reason} — ${lawName} did not inspect them`
    ),
  };
}
