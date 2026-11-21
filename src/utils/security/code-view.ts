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

function isLiteralText(ts: typeof TS, node: TS.Node): boolean {
  return (
    ts.isStringLiteral(node) ||
    ts.isNoSubstitutionTemplateLiteral(node) ||
    ts.isTemplateHead(node) ||
    ts.isTemplateMiddle(node) ||
    ts.isTemplateTail(node) ||
    ts.isRegularExpressionLiteral(node) ||
    ts.isJsxText(node)
  );
}

function blank(chars: string[], start: number, end: number): void {
  for (let i = start; i < end; i++) if (chars[i] !== '\n') chars[i] = ' ';
}

/**
 * The module an import names is code: `import { getAuth } from
 * 'firebase/auth'`, `require('md5')`, `import('x')` say what the program
 * uses, so they stay in `code` and are not literals.
 */
function isModuleSpecifier(ts: typeof TS, node: TS.Node): boolean {
  if (!ts.isStringLiteral(node) || !node.parent) return false;
  const parent = node.parent;
  if (ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent))
    return parent.moduleSpecifier === node;
  if (ts.isExternalModuleReference(parent)) return true;
  return (
    ts.isCallExpression(parent) &&
    parent.arguments[0] === node &&
    (parent.expression.kind === ts.SyntaxKind.ImportKeyword ||
      (ts.isIdentifier(parent.expression) &&
        parent.expression.text === 'require'))
  );
}

/** The last name of a callee: `crypto.createHash` → `createHash`. */
function calleeName(ts: typeof TS, expression: TS.Expression): string | null {
  if (ts.isIdentifier(expression)) return expression.text;
  if (ts.isPropertyAccessExpression(expression)) return expression.name.text;
  return null;
}

/** The name a value is bound to: property, variable, parameter or `x.name =`. */
function bindingName(ts: typeof TS, node: TS.Node): string | null {
  const parent = node.parent;
  if (!parent) return null;
  if (
    (ts.isPropertyAssignment(parent) ||
      ts.isVariableDeclaration(parent) ||
      ts.isParameter(parent) ||
      ts.isPropertyDeclaration(parent)) &&
    parent.initializer === node &&
    parent.name &&
    (ts.isIdentifier(parent.name) || ts.isStringLiteral(parent.name))
  )
    return parent.name.text;
  if (
    ts.isBinaryExpression(parent) &&
    parent.right === node &&
    parent.operatorToken.kind === ts.SyntaxKind.EqualsToken
  )
    return calleeName(ts, parent.left);
  return null;
}

/** Read a file through the parser. `fileName` decides TS/TSX/JS parsing. */
export function readCodeView(
  ts: typeof TS,
  content: string,
  fileName: string
): CodeView {
  const source = ts.createSourceFile(
    fileName,
    content,
    ts.ScriptTarget.Latest,
    true
  );
  const literals: Range[] = [];
  const strings: TS.StringLiteralLike[] = [];
  const visit = (node: TS.Node): void => {
    if (isModuleSpecifier(ts, node)) return;
    if (isLiteralText(ts, node)) {
      literals.push({ start: node.getStart(source), end: node.getEnd() });
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
        strings.push(node);
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(source);

  const code = content.split('');
  for (const { start, end } of literals) blank(code, start, end);
  // With every literal blanked, a `//` or `/*` left opens a comment.
  const commentless = content.split('');
  for (const match of code.join('').matchAll(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g)) {
    const start = match.index ?? 0;
    blank(code, start, start + match[0].length);
    blank(commentless, start, start + match[0].length);
  }

  const inLiteral = (offset: number): boolean =>
    literals.some(({ start, end }) => offset >= start && offset < end);

  const apiStrings = (name: RegExp): string[] =>
    strings
      .filter(node => {
        const parent = node.parent;
        if (
          parent &&
          (ts.isCallExpression(parent) || ts.isNewExpression(parent)) &&
          parent.arguments?.includes(node)
        ) {
          const callee = calleeName(ts, parent.expression);
          return !!callee && name.test(callee);
        }
        const bound = bindingName(ts, node);
        return !!bound && name.test(bound);
      })
      .map(node => node.text)
      // A value an API takes is one token ('md5', 'des-ede3-cbc', '777');
      // a sentence bound to WEAK_HASH_MESSAGE is a message about one.
      .filter(text => API_TOKEN.test(text));

  return {
    source,
    code: code.join(''),
    commentless: commentless.join(''),
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
