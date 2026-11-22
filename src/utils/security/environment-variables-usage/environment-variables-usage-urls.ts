/**
 * Hardcoded URLs, read from the parse (#433).
 *
 * The text scan ran three overlapping URL regexes over the raw file, so one
 * quoted URL was reported twice (bare host and full string), and URLs in
 * comments, `example.com` samples and documentation links were "endpoints".
 * Here each URL is taken once, from the string or template it is written in.
 */
import type * as TS from 'typescript';

/** One URL written in a string literal. */
export interface UrlLiteral {
  url: string;
  /** Where the string or template part that holds the URL starts. */
  start: number;
}

/** A URL with a host that has a dot and a top-level label, as the old scan required. */
const URL_IN_TEXT = /https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[^\s'"`<>)\]}]*/g;

/** Loopback hosts. */
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1']);

/** Names reserved for examples and tests (RFC 2606, RFC 6761), and their subdomains. */
const RESERVED_HOST =
  /(?:^|\.)(?:example\.(?:com|net|org)|example|test|invalid|localhost)$/i;

/**
 * URLs that are identifiers, not endpoints (#537): XML namespaces
 * (`http://www.w3.org/2000/svg`, `…/XML/1998/namespace`) and the schema.org
 * vocabulary (`https://schema.org/InStock`). They name a meaning; no program
 * connects to them and no environment changes them.
 */
const IDENTIFIER_URL =
  /^https?:\/\/(?:(?:www\.)?schema\.org(?:[/?#]|$)|www\.w3\.org\/(?:\d{4}|XML)\/)/i;

/**
 * JSX attributes whose string is not configuration (#537): a namespace
 * (`xmlns`, `xmlns:xlink`) and a link the page renders for its reader
 * (`href`) — a repository, a documentation page.
 */
const NON_ENDPOINT_JSX_ATTRIBUTE = /^(?:xmlns(?::[\w-]+)?|href)$/i;

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

/** The words of an identifier: `CLOUD_RUN_YAML_REFERENCE`, `docsUrl`. */
function nameWords(name: string): string[] {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map(word => word.toLowerCase());
}

/** The node itself, or the parentheses / assertions wrapped around it. */
function unwrap(ts: typeof TS, node: TS.Node): TS.Node {
  let current = node;
  while (
    current.parent &&
    (ts.isParenthesizedExpression(current.parent) ||
      ts.isAsExpression(current.parent) ||
      ts.isSatisfiesExpression(current.parent))
  )
    current = current.parent;
  return current;
}

/** The name a string literal is bound to: a property, variable or class field. */
function literalBindingName(ts: typeof TS, node: TS.Node): string | null {
  const value = unwrap(ts, node);
  const parent = value.parent;
  const bindsValue =
    !!parent &&
    (ts.isPropertyAssignment(parent) ||
      ts.isVariableDeclaration(parent) ||
      ts.isPropertyDeclaration(parent)) &&
    parent.initializer === value;
  if (!bindsValue) return null;
  const name = parent.name;
  return ts.isIdentifier(name) || ts.isStringLiteral(name) ? name.text : null;
}

function isDocLink(ts: typeof TS, node: TS.Node): boolean {
  const name = literalBindingName(ts, node);
  return !!name && nameWords(name).some(word => DOC_NAME_WORDS.has(word));
}

/** The JSX attribute a string is the value of (`href="…"`, `href={'…'}`). */
function jsxAttributeName(
  ts: typeof TS,
  source: TS.SourceFile,
  node: TS.Node
): string | null {
  let parent = unwrap(ts, node).parent;
  if (parent && ts.isJsxExpression(parent)) parent = parent.parent;
  return parent && ts.isJsxAttribute(parent)
    ? parent.name.getText(source)
    : null;
}

function isNonEndpointAttribute(
  ts: typeof TS,
  source: TS.SourceFile,
  node: TS.Node
): boolean {
  const name = jsxAttributeName(ts, source, node);
  return !!name && NON_ENDPOINT_JSX_ATTRIBUTE.test(name);
}

function hostOf(url: string): string {
  return (url.replace(/^https?:\/\//, '').split(/[/?#:]/)[0] ?? '').replace(
    /\.$/,
    ''
  );
}

/** True for a URL whose host is loopback or a name reserved for examples. */
export function isNonEndpointUrl(url: string): boolean {
  const host = hostOf(url).toLowerCase();
  return (
    LOOPBACK_HOSTS.has(host) ||
    RESERVED_HOST.test(host) ||
    IDENTIFIER_URL.test(url)
  );
}

/** A whole string (`'…'`, `` `…` ``) — the kind a name can be bound to. */
function isWholeString(ts: typeof TS, node: TS.Node): boolean {
  return ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node);
}

/** A piece of text in code: a string, or a part of a template. */
function isStringText(ts: typeof TS, node: TS.Node): boolean {
  return (
    isWholeString(ts, node) ||
    ts.isTemplateHead(node) ||
    ts.isTemplateMiddle(node) ||
    ts.isTemplateTail(node)
  );
}

/** The endpoint URLs written in one piece of string text. */
function urlsIn(
  ts: typeof TS,
  source: TS.SourceFile,
  node: TS.Node
): UrlLiteral[] {
  if (isWholeString(ts, node) && isDocLink(ts, node)) return [];
  if (isNonEndpointAttribute(ts, source, node)) return [];
  const start = node.getStart(source);
  // The value the program holds, escapes resolved — not the source text, in
  // which an escape such as `\n` and the next `${` of a template read as
  // part of the URL (#537).
  const text = (node as TS.LiteralLikeNode).text;
  return [...text.matchAll(URL_IN_TEXT)]
    .filter(match => !isNonEndpointUrl(match[0]))
    .map(match => ({ url: match[0], start }));
}

/**
 * Every URL written in a string or template literal of the file, once, with
 * the offset of the string it is written in. Comments and JSX text are prose,
 * not values; loopback and reserved example hosts are not endpoints; a URL
 * bound to a documentation name (`reference`, `DOCS_URL`) or rendered as a
 * JSX `href` is a link for a reader; namespaces and schema.org terms are
 * identifiers.
 */
export function findUrlLiterals(
  ts: typeof TS,
  source: TS.SourceFile
): UrlLiteral[] {
  const found: UrlLiteral[] = [];
  const visit = (node: TS.Node): void => {
    if (isStringText(ts, node)) {
      found.push(...urlsIn(ts, source, node));
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

/** The text of every string and template part of the file (quotes included). */
export function stringLiteralTexts(
  ts: typeof TS,
  source: TS.SourceFile
): string[] {
  const found: string[] = [];
  const visit = (node: TS.Node): void => {
    if (isStringText(ts, node)) {
      found.push(source.text.slice(node.getStart(source), node.getEnd()));
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}
