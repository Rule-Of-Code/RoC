/**
 * #369 — the class guard's scanner, used by the regression test.
 *
 * `PathOperations.getBasename(p)` is `path.parse(p).name`: the file name
 * WITHOUT its extension. A check that looks for an extension on that result
 * can never see one. The scanner finds, in every `src/` file, a getBasename
 * result that is then tested for something with a dot in it:
 *
 *   direct      getBasename(x).endsWith('.ts')
 *   variable    const name = getBasename(x); … name.endsWith('.ts') /
 *               name.includes('.spec.') / name.match(/\.ts$/)   (next lines)
 *   predicate   isSourceFile(getBasename(x)), isTestFile(name): a predicate
 *               whose own body (found by name anywhere in src/) tests its
 *               string parameter for something with a dot
 *
 * A name compared without its extension (`=== 'environment'`, a regex with
 * no `\.`, `includes('server')`) is the helper's purpose and is not reported.
 */
import fs from 'fs';
import path from 'path';

export interface Finding {
  file: string;
  line: number;
  text: string;
}

/** How many lines after a getBasename call (or a predicate's head) are read. */
const WINDOW = 15;
/** How many lines of a predicate body are read (an extension list can be long). */
const PREDICATE_WINDOW = 40;
/** A string argument with a dot before a word character, or a regex literal with `\.` in it. */
const DOTTED_ARG = String.raw`\(\s*(?:['"\x60][^'"\x60]*\.\w|\/[^/\n]*\\\.\w)`;
/** A string argument that is a constant reference (`patterns.EFFECTS_DOT`): resolved as "may hold a dot". */
const CONSTANT_ARG = String.raw`\(\s*\w+(?:\.\w+)+\s*\)`;
const CHECK = String.raw`\.\s*(?:endsWith|startsWith|includes|match|test|indexOf)`;
/** `isX(` / `hasX(` with its argument: a getBasename call, or a bare identifier. */
const PREDICATE_CALL = String.raw`\b((?:is|has)\w*)\(\s*([^()]*getBasename\(|\w+\s*\))`;

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return entry.name.endsWith('.ts') ? [full] : [];
  });
}

/**
 * Whether a predicate named `name`, defined anywhere in the sources as
 * `name(param: string)`, tests `param` for something with a dot — a literal,
 * or a constant whose value is not visible here (counted: the predicates in
 * this class compare against `FILE_EXTENSIONS.*` / `*_DOT` constants).
 */
function predicateChecksDots(name: string, texts: readonly string[]): boolean {
  const definition = new RegExp(String.raw`\b${name}\s*\(\s*(\w+)\s*:\s*string\s*\)[^{]*\{`, 'g');
  return texts.some(text =>
    [...text.matchAll(definition)].some(match => {
      const body = text
        .slice(match.index ?? 0)
        .split('\n')
        .slice(0, PREDICATE_WINDOW)
        .join(' ');
      const param = match[1] ?? '';
      const literal = new RegExp(String.raw`\b${param}${CHECK}${DOTTED_ARG}`);
      const constant = new RegExp(String.raw`\b${param}${CHECK}${CONSTANT_ARG}`);
      const viaList = new RegExp(String.raw`\.some\(\s*\(?\s*(\w+)\s*\)?\s*=>\s*${param}\s*\.\s*endsWith\(\s*\1\s*\)`);
      return literal.test(body) || constant.test(body) || (viaList.test(body) && /['"]\.\w+['"]/.test(body));
    })
  );
}

function findingsIn(file: string, root: string, texts: readonly string[]): Finding[] {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const out: Finding[] = [];
  const direct = new RegExp(String.raw`getBasename\([^()]*(?:\([^()]*\))?[^()]*\)\s*${CHECK}${DOTTED_ARG}`);
  const assigned = /(?:const|let)\s+(\w+)\s*=\s*(?:\w+\.)*getBasename\(/;
  const fedTo = (code: string, arg: RegExp): boolean =>
    [...code.matchAll(new RegExp(PREDICATE_CALL, 'g'))].some(m => arg.test(m[2] ?? '') && predicateChecksDots(m[1] ?? '', texts));

  lines.forEach((text, index) => {
    if (!text.includes('getBasename(') || /^\s*(?:\/\/|\*)/.test(text)) return;
    const report = (): void => {
      out.push({ file: path.relative(root, file).split(path.sep).join('/'), line: index + 1, text: text.trim() });
    };
    const window = lines.slice(index, index + WINDOW);
    if (direct.test(window.slice(0, 3).join(' ')) || fedTo(text, /getBasename\(/)) {
      report();
      return;
    }
    const name = assigned.exec(text)?.[1];
    if (!name) return;
    const rest = window.slice(1).join(' ');
    const onName = new RegExp(String.raw`\b${name}${CHECK}${DOTTED_ARG}`);
    if (onName.test(rest) || fedTo(rest, new RegExp(String.raw`^${name}\s*\)$`))) report();
  });
  return out;
}

/** Every extension check on a getBasename result under `srcDir`. */
export function extensionChecksOnBasename(srcDir: string): Finding[] {
  const root = path.dirname(srcDir);
  const files = sourceFiles(srcDir);
  const texts = files.map(file => fs.readFileSync(file, 'utf8'));
  return files.flatMap(file => findingsIn(file, root, texts));
}
