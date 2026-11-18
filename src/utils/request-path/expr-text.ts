/**
 * Bracket-aware scanning of expression text whose string literals have
 * already been replaced by placeholders (so no quote, bracket or comment
 * character inside a literal can confuse the scan).
 */

const OPEN_TO_CLOSE: Record<string, string> = { '(': ')', '[': ']', '{': '}' };
const CLOSE_TO_OPEN: Record<string, string> = { ')': '(', ']': '[', '}': '{' };

/** Index of the bracket closing the one at `open`, or -1 when unbalanced. */
export function matchingClose(text: string, open: number): number {
  const stack: string[] = [];
  for (let i = open; i < text.length; i++) {
    const ch = text[i] as string;
    if (OPEN_TO_CLOSE[ch]) stack.push(OPEN_TO_CLOSE[ch] as string);
    else if (CLOSE_TO_OPEN[ch]) {
      if (stack.pop() !== ch) return -1;
      if (stack.length === 0) return i;
    }
  }
  return -1;
}

/** Index of the bracket opening the one closing at `close`, or -1 when unbalanced. */
export function matchingOpen(text: string, close: number): number {
  const stack: string[] = [];
  for (let i = close; i >= 0; i--) {
    const ch = text[i] as string;
    if (CLOSE_TO_OPEN[ch]) stack.push(CLOSE_TO_OPEN[ch] as string);
    else if (OPEN_TO_CLOSE[ch]) {
      if (stack.pop() !== ch) return -1;
      if (stack.length === 0) return i;
    }
  }
  return -1;
}

/** Bracket depth at each index (the depth before the character is read). */
export function depthMap(text: string): number[] {
  const depths: number[] = new Array(text.length);
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i] as string;
    if (CLOSE_TO_OPEN[ch]) depth = Math.max(0, depth - 1);
    depths[i] = depth;
    if (OPEN_TO_CLOSE[ch]) depth++;
  }
  return depths;
}

/** Split on `separator` where it sits outside every bracket. Empty parts are dropped. */
export function splitTopLevel(text: string, separator = ','): string[] {
  const depths = depthMap(text);
  const parts: string[] = [];
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === separator && depths[i] === 0) {
      parts.push(text.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(text.slice(start));
  return parts.map(part => part.trim()).filter(part => part.length > 0);
}

/** Collapse whitespace runs to one space. */
export function collapse(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/** Every prefix of a dotted chain: `a.b.c` → `a`, `a.b`, `a.b.c`. */
export function chainPrefixes(chain: string): string[] {
  const parts = chain.split('.');
  return parts.map((_, i) => parts.slice(0, i + 1).join('.'));
}
