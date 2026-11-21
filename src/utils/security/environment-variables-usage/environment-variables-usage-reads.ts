/**
 * Environment variable reads, read from the parse (#433).
 *
 * The text scan judged every `process.env.X` of a file by a 150-character
 * window around the FIRST occurrence of that text, counted `default` or `? `
 * anywhere in the window as a fallback, and matched law prose and comments.
 *
 * Here each `process.env.X` read is judged where it stands.
 */
import type * as TS from 'typescript';

/** One `process.env.NAME` read and whether the code handles its absence. */
export interface EnvRead {
  name: string;
  start: number;
  handled: boolean;
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

/** Parentheses and type assertions: the value passes through unchanged. */
function isTransparent(ts: typeof TS, parent: TS.Node): boolean {
  return (
    ts.isParenthesizedExpression(parent) ||
    ts.isAsExpression(parent) ||
    ts.isNonNullExpression(parent) ||
    ts.isTypeAssertionExpression(parent) ||
    ts.isSatisfiesExpression(parent)
  );
}

/** `Number(<x>)`, `parseInt(<x>)`: as absent as its argument. */
function isConversionOf(
  ts: typeof TS,
  parent: TS.Node,
  current: TS.Node
): boolean {
  return (
    ts.isCallExpression(parent) &&
    parent.arguments.some(arg => arg === current) &&
    ts.isIdentifier(parent.expression) &&
    CONVERSIONS.has(parent.expression.text)
  );
}

/** `a || <x>`, `a ?? <x>`: the whole is absent when <x> is. */
function isFallbackRightOf(
  ts: typeof TS,
  parent: TS.Node,
  current: TS.Node
): boolean {
  if (!ts.isBinaryExpression(parent) || parent.right !== current) return false;
  const op = parent.operatorToken.kind;
  return LOGICAL_FALLBACK.has(op) && !ASSIGNMENT.has(op);
}

/** An arm (not the condition) of `?:`. */
function isConditionalArm(
  ts: typeof TS,
  parent: TS.Node,
  current: TS.Node
): boolean {
  return ts.isConditionalExpression(parent) && parent.condition !== current;
}

/**
 * The expression whose position decides: climbs out of parentheses, type
 * assertions, conversions, the right side of `a || <read>` and the arms of a
 * conditional — each passes the value through unchanged in absence.
 */
function climb(ts: typeof TS, node: TS.Node): TS.Node {
  let current = node;
  let parent = current.parent;
  while (
    parent &&
    (isTransparent(ts, parent) ||
      isConversionOf(ts, parent, current) ||
      isFallbackRightOf(ts, parent, current) ||
      isConditionalArm(ts, parent, current))
  ) {
    current = parent;
    parent = current.parent;
  }
  return current;
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

/** `process.env` itself. */
function isProcessEnv(ts: typeof TS, node: TS.Expression): boolean {
  return (
    ts.isPropertyAccessExpression(node) &&
    node.name.text === 'env' &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === 'process'
  );
}

/** `process.env.X = …` or `delete process.env.X`: a write, not a read. */
function isWrite(ts: typeof TS, node: TS.Node): boolean {
  const parent = node.parent;
  if (!parent) return false;
  if (ts.isDeleteExpression(parent)) return true;
  return (
    ts.isBinaryExpression(parent) &&
    parent.left === node &&
    parent.operatorToken.kind === ts.SyntaxKind.EqualsToken
  );
}

/** `process.env.NAME`, read (not assigned, not deleted). */
function envReadName(
  ts: typeof TS,
  node: TS.Node
): { name: string; node: TS.PropertyAccessExpression } | null {
  if (!ts.isPropertyAccessExpression(node)) return null;
  if (!isProcessEnv(ts, node.expression)) return null;
  const name = node.name.text;
  if (!ENV_NAME.test(name) || isWrite(ts, node)) return null;
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
