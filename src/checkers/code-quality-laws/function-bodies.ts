/**
 * The function bodies of a file, as token sequences, for Code Duplication
 * Control (#432).
 *
 * The text detector started a "block" on any line containing `=>` or
 * `function` and ran it to the next balancing `}`, so a block was the tail of
 * whatever came after the last arrow — a call-site fragment, a type member
 * (`checker: (c) => boolean`) or a one-line idiom — and every string was
 * replaced with `STR`, so two tables of different messages were "the same
 * code". Here a block is the body of a real function, read from the parse;
 * comments are not tokens, a string keeps its text, and only a number is
 * normalised.
 */
import type * as TS from 'typescript';

/** One function body: where it is, how big it is, and what it says. */
export interface FunctionBody {
  /** The token sequence, numbers normalised — equal keys are equal code. */
  key: string;
  /** Lines that hold at least one of its tokens. */
  lines: number;
  tokens: number;
  start: number;
  end: number;
}

/** A function-like node with a block body of its own. */
function blockBodyOf(ts: typeof TS, node: TS.Node): TS.Block | undefined {
  if (
    ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isArrowFunction(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isConstructorDeclaration(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node)
  ) {
    return node.body && ts.isBlock(node.body) ? node.body : undefined;
  }
  return undefined;
}

/** A JSDoc node: documentation hung on the tree, not code. */
function isJSDocNode(ts: typeof TS, node: TS.Node): boolean {
  return (
    node.kind >= ts.SyntaxKind.FirstJSDocNode &&
    node.kind <= ts.SyntaxKind.LastJSDocNode
  );
}

/** The tokens of a body, in order: every leaf of the tree under it. */
function tokensOf(
  ts: typeof TS,
  body: TS.Node,
  source: TS.SourceFile
): TS.Node[] {
  const tokens: TS.Node[] = [];
  const visit = (node: TS.Node): void => {
    if (isJSDocNode(ts, node)) return;
    const children = node.getChildren(source);
    if (children.length === 0) {
      if (node.getWidth(source) > 0) tokens.push(node);
      return;
    }
    children.forEach(visit);
  };
  visit(body);
  return tokens;
}

/** One body, measured and keyed. */
function describeBody(
  ts: typeof TS,
  body: TS.Block,
  source: TS.SourceFile
): FunctionBody {
  const tokens = tokensOf(ts, body, source);
  const lines = new Set(
    tokens.map(
      token => source.getLineAndCharacterOfPosition(token.getStart(source)).line
    )
  );
  const key = tokens
    .map(token => (ts.isNumericLiteral(token) ? 'NUM' : token.getText(source)))
    .join(' ');
  return {
    key,
    lines: lines.size,
    tokens: tokens.length,
    start: body.getStart(source),
    end: body.getEnd(),
  };
}

/** Every function body in the file, nested ones included. */
export function functionBodies(
  ts: typeof TS,
  source: TS.SourceFile
): FunctionBody[] {
  const bodies: FunctionBody[] = [];
  const visit = (node: TS.Node): void => {
    const body = blockBodyOf(ts, node);
    if (body) bodies.push(describeBody(ts, body, source));
    ts.forEachChild(node, visit);
  };
  visit(source);
  return bodies;
}
