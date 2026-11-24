/**
 * JSONC text: JSON with line and block comments and trailing commas, as
 * tsconfig.json and wrangler.jsonc are written. Moved out of
 * FileSystemOperations unchanged (#559); FileSystemOperations.stripJsonComments
 * delegates here.
 */

/**
 * Remove `//` and block comments and trailing commas, respecting string
 * literals so a `//` or `,` inside a value is never touched. Two passes: strip
 * comments first, then trailing commas, so a comment between a comma and its
 * closing brace does not leave the comma stranded.
 */
export function stripJsonComments(input: string): string {
  let out = '';
  let i = 0;
  while (i < input.length) {
    const c = input[i];
    const next = input[i + 1];
    if (c === '"') {
      const end = endOfString(input, i);
      out += input.slice(i, end);
      i = end;
    } else if (c === '/' && next === '/') {
      i = skipLineComment(input, i);
    } else if (c === '/' && next === '*') {
      i = skipBlockComment(input, i);
    } else {
      out += c;
      i++;
    }
  }
  return stripTrailingCommas(out);
}

/** Index just past a `//` line comment starting at `start`. */
function skipLineComment(input: string, start: number): number {
  let i = start + 2;
  while (i < input.length && input[i] !== '\n') i++;
  return i;
}

/** Index just past the closing of a block comment starting at `start`. */
function skipBlockComment(input: string, start: number): number {
  let i = start + 2;
  while (i < input.length && !(input[i] === '*' && input[i + 1] === '/')) i++;
  return i + 2;
}

function stripTrailingCommas(input: string): string {
  let out = '';
  let i = 0;
  while (i < input.length) {
    const c = input[i];
    if (c === '"') {
      const end = endOfString(input, i);
      out += input.slice(i, end);
      i = end;
    } else if (c === ',' && isTrailingComma(input, i)) {
      i++; // drop it
    } else {
      out += c;
      i++;
    }
  }
  return out;
}

/** From an opening quote at `start`, the index just past its closing quote. */
function endOfString(input: string, start: number): number {
  let i = start + 1;
  while (i < input.length) {
    if (input[i] === '\\') {
      i += 2;
      continue;
    }
    if (input[i] === '"') return i + 1;
    i++;
  }
  return i;
}

/** Is the comma at `commaIndex` immediately followed (past whitespace) by } or ]? */
function isTrailingComma(input: string, commaIndex: number): boolean {
  let j = commaIndex + 1;
  while (j < input.length && /\s/.test(input[j] as string)) j++;
  return input[j] === '}' || input[j] === ']';
}
