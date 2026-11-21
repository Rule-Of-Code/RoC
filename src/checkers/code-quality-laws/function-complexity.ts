/**
 * What Code Complexity Control measures in one TypeScript/JavaScript file,
 * read from the syntax tree instead of from the text.
 *
 * The text version found function bodies by brace matching over source with
 * only the comments removed, and three things followed from that (#430):
 *
 *  - an outer function was charged with every callback written inside it, so
 *    a three-branch function holding a busy callback was reported at 13;
 *  - an `if`, `?` or `{` inside a string or a regex literal was counted and
 *    used for brace matching, so one quote could run a "function" on for two
 *    hundred lines;
 *  - an arrow with an expression body, and a function whose return type is
 *    an inline object literal, were never measured at all.
 *
 * Here every function-like node with a body is measured on its OWN body: a
 * nested function starts its own count and adds nothing to the one around it.
 */
import type * as TS from 'typescript';
import { readSource, type SourceView } from './source-view';

/** The measurements of one file. */
export interface FileComplexity {
  /** Lines holding code: not blank, not only comments. */
  codeLines: number;
  /** Function-like nodes with a body (declarations, arrows, methods, accessors). */
  functions: number;
  /** Decision points in the whole file. */
  conditionals: number;
  /** Cyclomatic complexity of the worst single function (0 when none). */
  worstFunction: number;
}

/**
 * A node that adds one path through the function it is written in: the
 * branches and loops, each `case`, `catch` and `?:`, and `&&`/`||` (with their
 * assignment forms). `??` and optional chaining are not counted, the same
 * choice the text detector made, so a defaulted value is not a branch.
 */
function isDecisionPoint(ts: typeof TS, node: TS.Node): boolean {
  const kinds = ts.SyntaxKind;
  const branching = [
    kinds.IfStatement,
    kinds.ForStatement,
    kinds.ForInStatement,
    kinds.ForOfStatement,
    kinds.WhileStatement,
    kinds.DoStatement,
    kinds.CaseClause,
    kinds.CatchClause,
    kinds.ConditionalExpression,
  ];
  if (branching.includes(node.kind)) return true;
  if (!ts.isBinaryExpression(node)) return false;
  return [
    kinds.AmpersandAmpersandToken,
    kinds.BarBarToken,
    kinds.AmpersandAmpersandEqualsToken,
    kinds.BarBarEqualsToken,
  ].includes(node.operatorToken.kind);
}

/** A function with a body of its own — not an overload, type or signature. */
function hasOwnBody(ts: typeof TS, node: TS.Node): boolean {
  return (
    (ts.isFunctionDeclaration(node) ||
      ts.isFunctionExpression(node) ||
      ts.isArrowFunction(node) ||
      ts.isMethodDeclaration(node) ||
      ts.isConstructorDeclaration(node) ||
      ts.isGetAccessorDeclaration(node) ||
      ts.isSetAccessorDeclaration(node)) &&
    node.body !== undefined
  );
}

/** Every function's own complexity, and the file's decision points. */
function measureFunctions(
  ts: typeof TS,
  source: TS.SourceFile
): { scores: number[]; conditionals: number } {
  const scores: number[] = [];
  let conditionals = 0;
  // Index into `scores` of the function being read; -1 is module level.
  const visit = (node: TS.Node, owner: number): void => {
    let current = owner;
    if (hasOwnBody(ts, node)) {
      scores.push(1);
      current = scores.length - 1;
    } else if (isDecisionPoint(ts, node)) {
      conditionals++;
      if (current >= 0) scores[current] = (scores[current] ?? 1) + 1;
    }
    ts.forEachChild(node, child => visit(child, current));
  };
  visit(source, -1);
  return { scores, conditionals };
}

/**
 * Lines that hold code. A line that is blank or only a comment is not one
 * (ESLint `max-lines` with skipBlankLines and skipComments); a line inside a
 * multi-line string or template is, because the literal is part of the code.
 * The comments come from the shared source view, which finds them only after
 * the parsed literals are blanked — a `//` in a string cannot open one.
 */
function countCodeLines(view: SourceView): number {
  const chars = view.source.text.split('');
  for (const comment of view.comments) {
    const end = comment.start + comment.text.length;
    for (let i = comment.start; i < end; i++) {
      if (chars[i] !== '\n') chars[i] = ' ';
    }
  }
  return chars
    .join('')
    .split('\n')
    .filter(line => line.trim() !== '').length;
}

/** Measure one file. `fileName` decides how it is parsed (.tsx/.jsx read JSX). */
export function measureFileComplexity(
  ts: typeof TS,
  content: string,
  fileName: string
): FileComplexity {
  const view = readSource(ts, content, fileName);
  const { scores, conditionals } = measureFunctions(ts, view.source);
  return {
    codeLines: countCodeLines(view),
    functions: scores.length,
    conditionals,
    worstFunction: scores.length > 0 ? Math.max(...scores) : 0,
  };
}
