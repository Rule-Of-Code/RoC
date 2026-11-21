/**
 * Environment variable reads and hardcoded URLs, read from the parse (#433).
 *
 * The text scan judged every `process.env.X` of a file by a 150-character
 * window around the FIRST occurrence of that text, counted `default` or `? `
 * anywhere in the window as a fallback, matched law prose and comments, and
 * ran three overlapping URL regexes so one quoted URL was reported twice.
 *
 * Here each `process.env.X` read is judged where it stands, and each URL is
 * taken once, from the string it is written in.
 */
import type * as TS from 'typescript';

/** One `process.env.NAME` read and whether the code handles its absence. */
export interface EnvRead {
  name: string;
  start: number;
  handled: boolean;
}

/** One URL written in a string literal. */
export interface UrlLiteral {
  url: string;
  start: number;
}

/** The names the text scan reported: upper-case, as environment names are. */
const ENV_NAME = /^[A-Z_][A-Z0-9_]*$/;

/**
 * Variables the CI system sets on every build. Code that reads them is
 * asking "am I on CI, and which one?" — absent is the answer off CI, not a
 * missing fallback. Prefixes are the documented namespaces of GitHub
 * Actions (`GITHUB_`, `RUNNER_`), GitLab (`CI_`, `GITLAB_`), Bitbucket
 * Pipelines, CircleCI, Travis CI and Buildkite.
 */
const CI_PREFIXES = [
  'GITHUB_',
  'RUNNER_',
  'CI_',
  'GITLAB_',
  'BITBUCKET_',
  'CIRCLE_',
  'TRAVIS_',
  'BUILDKITE_',
] as const;
const CI_NAMES = new Set([
  'CI',
  'CIRCLECI',
  'TRAVIS',
  'BUILDKITE',
  'TF_BUILD', // Azure Pipelines
  // Jenkins
  'JENKINS_URL',
  'BUILD_NUMBER',
  'BUILD_ID',
  'BUILD_URL',
  'JOB_NAME',
  'BRANCH_NAME',
  'GIT_BRANCH',
  'GIT_COMMIT',
]);

/** True for a variable the CI system itself provides. */
export function isCiProvided(name: string): boolean {
  return CI_NAMES.has(name) || CI_PREFIXES.some(p => name.startsWith(p));
}

/** A URL with a host that has a dot and a top-level label, as the old scan required. */
const URL_IN_TEXT = /https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[^\s'"`<>)\]}]*/g;

/**
 * Hosts that are never a real endpoint: loopback, and the names reserved
 * for examples and tests (RFC 2606, RFC 6761).
 */
const NON_ENDPOINT_HOST =
  /^(?:localhost|127\.0\.0\.1|(?:[^.]+\.)*(?:example\.(?:com|net|org)|example|test|invalid|localhost))$/i;

/**
 * A URL bound to one of these names is a link for a reader — a manual page,
 * a reference — not an endpoint the program calls or that differs between
 * environments.
 */
const DOC_NAME_WORDS = new Set([
  'doc',
  'docs',
  'documentation',
  'reference',
  'help',
  'guide',
  'manual',
  'homepage',
  'readme',
]);

const LOGICAL_FALLBACK = new Set<number>();
const COMPARISON = new Set<number>();
const ASSIGNMENT = new Set<number>();

function initOperators(ts: typeof TS): void {
  if (LOGICAL_FALLBACK.size > 0) return;
  const k = ts.SyntaxKind;
  for (const op of [
    k.QuestionQuestionToken,
    k.BarBarToken,
    k.QuestionQuestionEqualsToken,
    k.BarBarEqualsToken,
  ])
    LOGICAL_FALLBACK.add(op);
  for (const op of [
    k.EqualsEqualsEqualsToken,
    k.ExclamationEqualsEqualsToken,
    k.EqualsEqualsToken,
    k.ExclamationEqualsToken,
    k.LessThanToken,
    k.GreaterThanToken,
    k.LessThanEqualsToken,
    k.GreaterThanEqualsToken,
  ])
    COMPARISON.add(op);
  for (const op of [
    k.EqualsToken,
    k.QuestionQuestionEqualsToken,
    k.BarBarEqualsToken,
    k.AmpersandAmpersandEqualsToken,
  ])
    ASSIGNMENT.add(op);
}

/** Conversions whose result is as absent as their argument. */
const CONVERSIONS = new Set([
  'Number',
  'String',
  'Boolean',
  'parseInt',
  'parseFloat',
]);

/**
 * The expression whose position decides: climbs out of parentheses, type
 * assertions, conversions, the right side of `a || <read>` and the arms of a
 * conditional — each passes the value through unchanged in absence.
 */
function climb(ts: typeof TS, node: TS.Node): TS.Node {
  let current = node;
  for (;;) {
    const parent = current.parent;
    if (!parent) return current;
    if (
      ts.isParenthesizedExpression(parent) ||
      ts.isAsExpression(parent) ||
      ts.isNonNullExpression(parent) ||
      ts.isTypeAssertionExpression(parent) ||
      ts.isSatisfiesExpression(parent)
    ) {
      current = parent;
      continue;
    }
    if (
      ts.isCallExpression(parent) &&
      parent.arguments.includes(current as TS.Expression) &&
      ts.isIdentifier(parent.expression) &&
      CONVERSIONS.has(parent.expression.text)
    ) {
      current = parent;
      continue;
    }
    if (
      ts.isBinaryExpression(parent) &&
      parent.right === current &&
      LOGICAL_FALLBACK.has(parent.operatorToken.kind) &&
      !ASSIGNMENT.has(parent.operatorToken.kind)
    ) {
      current = parent;
      continue;
    }
    if (ts.isConditionalExpression(parent) && parent.condition !== current) {
      current = parent;
      continue;
    }
    return current;
  }
}

/** `<read> ?? d`, `<read> || d`, `a && <read>`, `<read> === 'x'`. */
function isGuardingOperand(
  ts: typeof TS,
  node: TS.Node,
  parent: TS.BinaryExpression
): boolean {
  const op = parent.operatorToken.kind;
  if (parent.left === node && LOGICAL_FALLBACK.has(op)) return true;
  return op === ts.SyntaxKind.AmpersandAmpersandToken || COMPARISON.has(op);
}

/** The condition of `if`, `while`, `do`, `for` or `?:`. */
function isCondition(ts: typeof TS, node: TS.Node, parent: TS.Node): boolean {
  if (
    ts.isIfStatement(parent) ||
    ts.isWhileStatement(parent) ||
    ts.isDoStatement(parent)
  )
    return parent.expression === node;
  if (ts.isForStatement(parent) || ts.isConditionalExpression(parent))
    return parent.condition === node;
  return false;
}

/** The object of `?.`: `<read>?.trim()`. */
function isOptionalChainObject(
  ts: typeof TS,
  node: TS.Node,
  parent: TS.Node
): boolean {
  return (
    (ts.isPropertyAccessExpression(parent) ||
      ts.isElementAccessExpression(parent) ||
      ts.isCallExpression(parent)) &&
    parent.expression === node &&
    parent.questionDotToken !== undefined
  );
}

/**
 * True when the expression stands where its absence is handled: the left
 * of `??`/`||`, either side of `&&`, a comparison, `!`, `typeof`, a
 * condition, or the object of `?.`.
 */
function isGuardPosition(ts: typeof TS, node: TS.Node): boolean {
  const parent = node.parent;
  if (!parent) return false;
  if (ts.isBinaryExpression(parent)) return isGuardingOperand(ts, node, parent);
  if (ts.isPrefixUnaryExpression(parent))
    return parent.operator === ts.SyntaxKind.ExclamationToken;
  if (ts.isTypeOfExpression(parent)) return true;
  return (
    isCondition(ts, node, parent) || isOptionalChainObject(ts, node, parent)
  );
}

/** The name a read is stored in: `const v = process.env.X`. */
function boundName(ts: typeof TS, node: TS.Node): string | null {
  const parent = node.parent;
  if (
    parent &&
    ts.isVariableDeclaration(parent) &&
    parent.initializer === node &&
    ts.isIdentifier(parent.name)
  )
    return parent.name.text;
  return null;
}

/** The nearest function body (or the file) the node is in. */
function scopeOf(ts: typeof TS, node: TS.Node): TS.Node {
  let current = node.parent;
  while (current && !ts.isFunctionLike(current) && !ts.isSourceFile(current))
    current = current.parent;
  return current ?? node.getSourceFile();
}

/** `process.env.NAME`, read (not assigned, not deleted). */
function envReadName(
  ts: typeof TS,
  node: TS.Node
): { name: string; node: TS.PropertyAccessExpression } | null {
  if (!ts.isPropertyAccessExpression(node)) return null;
  const object = node.expression;
  if (
    !ts.isPropertyAccessExpression(object) ||
    object.name.text !== 'env' ||
    !ts.isIdentifier(object.expression) ||
    object.expression.text !== 'process'
  )
    return null;
  const name = node.name.text;
  if (!ENV_NAME.test(name)) return null;
  const parent = node.parent;
  if (
    parent &&
    ts.isBinaryExpression(parent) &&
    parent.left === node &&
    parent.operatorToken.kind === ts.SyntaxKind.EqualsToken
  )
    return null;
  if (parent && ts.isDeleteExpression(parent)) return null;
  return { name, node };
}

/** Every identifier named `name` in `scope` that stands in a guard position. */
function isNameGuarded(ts: typeof TS, scope: TS.Node, name: string): boolean {
  let guarded = false;
  const visit = (node: TS.Node): void => {
    if (guarded) return;
    if (
      ts.isIdentifier(node) &&
      node.text === name &&
      isGuardPosition(ts, climb(ts, node))
    ) {
      guarded = true;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(scope);
  return guarded;
}

/**
 * Every `process.env.NAME` read of the file, CI-provided names left out.
 *
 * A read is handled when it stands in a guard position itself, when it is
 * stored in a variable that is guarded in the same function, or when the
 * same function guards another read of the same variable (`if
 * (!process.env.X) throw …` before using it).
 */
export function findEnvReads(ts: typeof TS, source: TS.SourceFile): EnvRead[] {
  initOperators(ts);
  const found: Array<{ name: string; node: TS.Node; direct: boolean }> = [];
  const visit = (node: TS.Node): void => {
    const read = envReadName(ts, node);
    if (read) {
      if (!isCiProvided(read.name)) {
        const top = climb(ts, read.node);
        let direct = isGuardPosition(ts, top);
        if (!direct) {
          const bound = boundName(ts, top);
          if (bound) direct = isNameGuarded(ts, scopeOf(ts, top), bound);
        }
        found.push({ name: read.name, node: read.node, direct });
      }
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(source);

  const guardedInScope = new Map<TS.Node, Set<string>>();
  for (const read of found) {
    if (!read.direct) continue;
    const scope = scopeOf(ts, read.node);
    const names = guardedInScope.get(scope) ?? new Set<string>();
    names.add(read.name);
    guardedInScope.set(scope, names);
  }
  return found.map(read => ({
    name: read.name,
    start: read.node.getStart(source),
    handled:
      read.direct ||
      !!guardedInScope.get(scopeOf(ts, read.node))?.has(read.name),
  }));
}

/** The words of an identifier: `CLOUD_RUN_YAML_REFERENCE`, `docsUrl`. */
function nameWords(name: string): string[] {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map(word => word.toLowerCase());
}

/** The name a string literal is bound to, through parentheses and assertions. */
function literalBindingName(ts: typeof TS, node: TS.Node): string | null {
  let current = node;
  while (
    current.parent &&
    (ts.isParenthesizedExpression(current.parent) ||
      ts.isAsExpression(current.parent) ||
      ts.isSatisfiesExpression(current.parent))
  )
    current = current.parent;
  const parent = current.parent;
  if (!parent) return null;
  if (
    (ts.isPropertyAssignment(parent) ||
      ts.isVariableDeclaration(parent) ||
      ts.isPropertyDeclaration(parent)) &&
    parent.initializer === current &&
    parent.name &&
    (ts.isIdentifier(parent.name) || ts.isStringLiteral(parent.name))
  )
    return parent.name.text;
  return null;
}

function isDocLink(ts: typeof TS, node: TS.Node): boolean {
  const name = literalBindingName(ts, node);
  return !!name && nameWords(name).some(word => DOC_NAME_WORDS.has(word));
}

function hostOf(url: string): string {
  return (url.replace(/^https?:\/\//, '').split(/[/?#:]/)[0] ?? '').replace(
    /\.$/,
    ''
  );
}

/** True for a URL whose host is loopback or a name reserved for examples. */
export function isNonEndpointUrl(url: string): boolean {
  return NON_ENDPOINT_HOST.test(hostOf(url));
}

/**
 * Every URL written in a string or template literal of the file, once, at
 * the offset it is written at. Comments and JSX text are prose, not values;
 * loopback and reserved example hosts are not endpoints; a URL bound to a
 * documentation name (`reference`, `DOCS_URL`) is a link for a reader.
 */
export function findUrlLiterals(
  ts: typeof TS,
  source: TS.SourceFile
): UrlLiteral[] {
  const found: UrlLiteral[] = [];
  const visit = (node: TS.Node): void => {
    if (
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node)
    ) {
      const start = node.getStart(source);
      const text = source.text.slice(start, node.getEnd());
      const docLink =
        (ts.isStringLiteral(node) ||
          ts.isNoSubstitutionTemplateLiteral(node)) &&
        isDocLink(ts, node);
      if (!docLink)
        for (const match of text.matchAll(URL_IN_TEXT)) {
          if (isNonEndpointUrl(match[0])) continue;
          found.push({ url: match[0], start: start + (match.index ?? 0) });
        }
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}
