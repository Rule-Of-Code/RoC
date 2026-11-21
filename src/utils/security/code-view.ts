/**
 * A source file as the security detectors should read it (#426).
 *
 * The detectors matched their patterns against the raw file, so a detector's
 * own pattern table (`WEAK_ALGORITHMS = ['MD5', …]`, `/md5.*password/`), the
 * law registry's prose and every message string were judged as the project's
 * code. Here the TypeScript parser finds every string, template and regex
 * literal and every comment:
 *
 * - `code` is the file with all of them blanked — what the program does;
 * - `commentless` is the file with only the comments blanked;
 * - `strings` are the texts of the string literals;
 * - `inLiteral(offset)` says whether a match starts inside a literal, so a
 *   pattern that spans code and a string (`password = "…"`) can be told from
 *   the same text written inside a string;
 * - `apiStrings(name)` gives the one-token strings the code hands to an API: the
 *   arguments of a call whose callee's name matches, and the value of a
 *   property, variable or parameter whose name matches (`createHash('md5')`,
 *   `{ algorithm: 'des' }`, `const HASH = 'sha1'`).
 *
 * A module specifier (`from 'firebase/auth'`, `require('md5')`) is code.
 *
 * Offsets and line breaks are kept: an offset or line in one view points at
 * the same place in the file.
 */
import type * as TS from 'typescript';
import { readSource } from '../../checkers/code-quality-laws/source-view';

/** The views of one file. */
export interface CodeView {
  source: TS.SourceFile;
  code: string;
  commentless: string;
  /** The text of every string literal (and template without substitutions). */
  strings: string[];
  inLiteral(offset: number): boolean;
  apiStrings(name: RegExp): string[];
}

type Range = { start: number; end: number };

/** One token: an algorithm name, a mode, an identifier-like value. */
const API_TOKEN = /^[\w.:/+-]+$/;

/** A string, template part, regex or JSX text token (not a number). */
function isTextToken(ts: typeof TS, node: TS.Node): boolean {
  const k = ts.SyntaxKind;
  const inRange =
    node.kind >= k.FirstLiteralToken && node.kind <= k.LastTemplateToken;
  return inRange && !ts.isNumericLiteral(node) && !ts.isBigIntLiteral(node);
}

/** `require('x')` / `import('x')`. */
function isModuleCall(ts: typeof TS, call: TS.CallExpression): boolean {
  const callee = call.expression;
  return (
    callee.kind === ts.SyntaxKind.ImportKeyword ||
    (ts.isIdentifier(callee) && callee.text === 'require')
  );
}

/**
 * The module an import names is code: `import { getAuth } from
 * 'firebase/auth'`, `require('md5')`, `import('x')` say what the program
 * uses, so they stay in `code` and are not literals.
 */
function isModuleSpecifier(ts: typeof TS, node: TS.Node): boolean {
  const parent = node.parent;
  if (!ts.isStringLiteral(node) || !parent) return false;
  if (ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent))
    return parent.moduleSpecifier === node;
  if (ts.isExternalModuleReference(parent)) return true;
  return (
    ts.isCallExpression(parent) &&
    parent.arguments[0] === node &&
    isModuleCall(ts, parent)
  );
}

/** The last name of a callee: `crypto.createHash` → `createHash`. */
function calleeName(ts: typeof TS, expression: TS.Expression): string | null {
  if (ts.isIdentifier(expression)) return expression.text;
  if (ts.isPropertyAccessExpression(expression)) return expression.name.text;
  return null;
}

/** The name a declaration binds its initializer to: property, variable, parameter, field. */
function declaredName(ts: typeof TS, node: TS.Node): string | null {
  const parent = node.parent;
  const declares =
    !!parent &&
    (ts.isPropertyAssignment(parent) ||
      ts.isVariableDeclaration(parent) ||
      ts.isParameter(parent) ||
      ts.isPropertyDeclaration(parent)) &&
    parent.initializer === node;
  if (!declares) return null;
  const name = parent.name;
  return ts.isIdentifier(name) || ts.isStringLiteral(name) ? name.text : null;
}

/** The target of `x.name = <node>`. */
function assignedName(ts: typeof TS, node: TS.Node): string | null {
  const parent = node.parent;
  if (
    !parent ||
    !ts.isBinaryExpression(parent) ||
    parent.right !== node ||
    parent.operatorToken.kind !== ts.SyntaxKind.EqualsToken
  )
    return null;
  return calleeName(ts, parent.left);
}

/** The callee a string is an argument of, if any. */
function argumentOf(ts: typeof TS, node: TS.Node): string | null | undefined {
  const parent = node.parent;
  const isArgument =
    !!parent &&
    (ts.isCallExpression(parent) || ts.isNewExpression(parent)) &&
    !!parent.arguments?.some(arg => arg === node);
  return isArgument ? calleeName(ts, parent.expression) : undefined;
}

/** Does the code hand this string to an API whose name matches? */
function handedTo(ts: typeof TS, node: TS.Node, name: RegExp): boolean {
  const callee = argumentOf(ts, node);
  if (callee !== undefined) return !!callee && name.test(callee);
  const bound = declaredName(ts, node) ?? assignedName(ts, node);
  return !!bound && name.test(bound);
}

/** `content` with `[start, end)` ranges turned into spaces, line breaks kept. */
function blanked(content: string, ranges: Range[]): string {
  const chars = content.split('');
  for (const { start, end } of ranges)
    for (let i = start; i < end; i++) if (chars[i] !== '\n') chars[i] = ' ';
  return chars.join('');
}

/** Read a file through the parser. `fileName` decides TS/TSX/JS parsing. */
export function readCodeView(
  ts: typeof TS,
  content: string,
  fileName: string
): CodeView {
  // The shared source view blanks every literal and comment; module names
  // are put back, since an import is code.
  const view = readSource(ts, content, fileName);
  const { source } = view;
  const literals: Range[] = [];
  const strings: TS.StringLiteralLike[] = [];
  const code = view.code.split('');
  const visit = (node: TS.Node): void => {
    if (isModuleSpecifier(ts, node)) {
      for (let i = node.getStart(source); i < node.getEnd(); i++)
        code[i] = content[i] ?? ' ';
      return;
    }
    if (isTextToken(ts, node)) {
      literals.push({ start: node.getStart(source), end: node.getEnd() });
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
        strings.push(node);
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(source);

  const commentless = blanked(
    content,
    view.comments.map(c => ({ start: c.start, end: c.start + c.text.length }))
  );
  const inLiteral = (offset: number): boolean =>
    literals.some(({ start, end }) => offset >= start && offset < end);
  const apiStrings = (name: RegExp): string[] =>
    strings
      .filter(node => handedTo(ts, node, name))
      .map(node => node.text)
      // A value an API takes is one token ('md5', 'des-ede3-cbc', '777');
      // a sentence bound to WEAK_HASH_MESSAGE is a message about one.
      .filter(text => API_TOKEN.test(text));

  return {
    source,
    code: code.join(''),
    commentless,
    strings: strings.map(node => node.text),
    inLiteral,
    apiStrings,
  };
}

/** True when `pattern` matches somewhere that starts in code, not in a literal. */
export function matchesFromCode(view: CodeView, pattern: RegExp): boolean {
  const global = new RegExp(
    pattern.source,
    pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`
  );
  for (const match of view.commentless.matchAll(global))
    if (!view.inLiteral(match.index ?? 0)) return true;
  return false;
}
