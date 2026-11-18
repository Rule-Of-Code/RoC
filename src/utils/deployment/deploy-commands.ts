/**
 * Deploy commands found in CI files, shell scripts, Makefiles and
 * package.json scripts, with the flags each one passes.
 *
 * A command is the text from its first words to the end of the shell
 * command: continuation lines (`\` in sh, `` ` `` in PowerShell, `^` in
 * cmd), the following lines of a YAML folded scalar (`run: >`), and lines
 * that continue with a flag (`--cpu 1` on its own line) are joined; the text
 * stops at `&&`, `||`, `;` or `|` outside quotes. A Cloud Build step that
 * runs gcloud/aws/az through `entrypoint` (or the gcloud builder image) and
 * passes the words as `args` is read as the same command.
 */

import { flowItems, type YamlEntry } from './yaml-lines';

export interface FoundCommand {
  line: number;
  text: string;
}

const CONTINUATION = /[\\`^]\s*$/;
const FLAG_LINE = /^-{1,2}[A-Za-z]/;
const GHA_EXPRESSION = /\$\{\{[^}]*\}\}/g;
const SUBSTITUTION = /\$\([^)]*\)/g;
const EXPANSION = /^["']?(?:\$\{?[A-Za-z_][A-Za-z0-9_]*\}?|\$\{[^}]*\}|%[A-Za-z_][A-Za-z0-9_]*%|\$GHA|\$SUB)["']?$/;
const ENTRYPOINTS = ['gcloud', 'aws', 'az'];

const stripComment = (line: string): string => line.replace(/(^|\s)#.*$/, '$1');

/** The text up to the first shell operator outside quotes. */
export function firstShellCommand(text: string): string {
  let quote: string | null = null;
  for (let i = 0; i < text.length; i++) {
    const c = text[i] ?? '';
    if (quote) {
      if (c === quote) quote = null;
    } else if (c === '"' || c === "'") {
      quote = c;
    } else if (c === ';' || c === '|' || (c === '&' && text[i + 1] === '&')) {
      return text.slice(0, i);
    }
  }
  return text;
}

/** Lines that belong to a folded block scalar (`key: >`), by 0-based index. */
export function foldedLines(entries: YamlEntry[]): Set<number> {
  return new Set(entries.filter(entry => entry.folded).flatMap(entry => entry.block.map(line => line.line - 1)));
}

/** Join the lines that continue the command starting on line `index`. */
function joined(lines: string[], index: number, start: number, folded: Set<number>): string {
  let text = stripComment(lines[index] ?? '').slice(start).trimEnd();
  for (let next = index + 1; next < lines.length; next++) {
    const following = stripComment(lines[next] ?? '').trim();
    if (CONTINUATION.test(text)) {
      text = `${text.replace(CONTINUATION, '')} ${following}`;
    } else if (following && (FLAG_LINE.test(following) || (folded.has(index) && folded.has(next)))) {
      text = `${text} ${following}`;
    } else {
      break;
    }
  }
  return text;
}

/**
 * What may stand before a command on its line: nothing, a shell operator or
 * keyword, a YAML key or list dash, an env assignment, Make's `@`, or the
 * quote that opens a `-c '…'` script.
 */
const COMMAND_POSITION =
  /(?:^|[;&|(`@]|\$\(|\b(?:then|do|else|exec|time|sudo|env|xargs)|^\s*-|:\s*(?:[|>][-+]?)?|\b[A-Za-z_]\w*=\S*|["'])\s*$/;

/**
 * Is the match a command, not a mention in prose? A command opened by a
 * quote must continue inside it: `'gcloud run deploy'` closed right after
 * the words is a name in a sentence.
 */
function atCommandPosition(line: string, match: RegExpExecArray): boolean {
  const before = line.slice(0, match.index);
  if (!COMMAND_POSITION.test(before)) return false;
  const quote = /["']$/.exec(before.trimEnd())?.[0];
  return !quote || line[match.index + match[0].length] !== quote;
}

/** Every occurrence of a command (`start`) in a text, with its joined arguments. */
export function commandsInText(text: string, start: RegExp, folded: Set<number> = new Set()): FoundCommand[] {
  const lines = text.split(/\r?\n/);
  const found: FoundCommand[] = [];
  lines.forEach((line, index) => {
    const code = stripComment(line);
    const match = start.exec(code);
    if (!match || !atCommandPosition(code, match)) return;
    found.push({ line: index + 1, text: firstShellCommand(joined(lines, index, match.index, folded)) });
  });
  return found;
}

/** The commands Cloud Build-style steps run as `entrypoint` + `args`. */
export function argsCommands(entries: YamlEntry[]): FoundCommand[] {
  return entries
    .filter(entry => entry.key === 'args' && entry.item >= 0)
    .flatMap(args => {
      const sibling = (key: string): string | undefined =>
        entries.find(entry => entry.item === args.item && entry.key === key && entry.indent === args.indent)?.value;
      const entrypoint = sibling('entrypoint') ?? (/cloud-builders\/gcloud(?::|$)/.test(sibling('name') ?? '') ? 'gcloud' : undefined);
      if (!entrypoint || !ENTRYPOINTS.includes(entrypoint)) return [];
      const words = args.items.length > 0 ? args.items.map(item => item.text) : flowItems(args.value);
      return [{ line: args.line, text: [entrypoint, ...words].join(' ') }];
    });
}

/** The `--flag` and `-f` names a command passes. */
export function flagsOf(text: string): Set<string> {
  const flags = new Set<string>();
  for (const match of text.matchAll(/(?:^|[\s'"[,(])(--[a-z][a-z0-9-]*)/gi)) flags.add((match[1] ?? '').toLowerCase());
  for (const match of text.matchAll(/(?:^|[\s'"[,])(-[a-zA-Z])(?=[\s'"=,\]]|$)/g)) flags.add(match[1] ?? '');
  return flags;
}

/** The value of `--name=value` or `--name value`, unquoted. */
export function flagValue(text: string, name: string): string | null {
  const match = new RegExp(`(?:^|\\s)${name}(?:=|\\s+)(["']?)([^\\s"']+)\\1`).exec(text);
  return match?.[2] ?? null;
}

/**
 * Whole-argument expansions (`$EXTRA_FLAGS`, `${{ inputs.flags }}`, `$(cat
 * flags)`) that are not the value of a flag and not one of the command's
 * positional arguments: they may carry the flags the law looks for.
 */
export function opaqueArguments(text: string, commandWords: number, positionals: number): string[] {
  const tokens = text.replace(GHA_EXPRESSION, '$GHA').replace(SUBSTITUTION, '$SUB').trim().split(/\s+/).slice(commandWords);
  const opaque: string[] = [];
  let positional = 0;
  tokens.forEach((token, index) => {
    const previous = tokens[index - 1] ?? '';
    const isValue = previous.startsWith('-') && !previous.includes('=');
    if (token.startsWith('-') || isValue) return;
    if (positional++ < positionals) return;
    if (EXPANSION.test(token)) opaque.push(token);
  });
  return opaque;
}

/** How many words the command's start match spans (`gcloud beta run deploy` → 4). */
export function wordCount(text: string, start: RegExp): number {
  const match = start.exec(text);
  return match ? match[0].trim().split(/\s+/).length : 0;
}

