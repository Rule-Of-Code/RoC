/**
 * The classes of a TypeScript file, and the members of each, by position.
 *
 * Several laws need to ask a question a flat pattern cannot: "is this call in
 * the CONSTRUCTOR or in ionViewWillEnter?", "does THIS class implement the
 * interface for the hook it declares?". A regex over the file answers for the
 * file, and a page with two classes, or a hook name in a comment, gets the
 * wrong answer.
 *
 * This is a lexer, not a parser. It masks comments and string contents with
 * spaces — newlines kept, so every index and line number still points into
 * the original text — and then matches braces over code only. It does not
 * understand regex literals or every corner of the grammar; a member it cannot
 * delimit is skipped, never guessed.
 */

export interface TsMember {
  name: string;
  kind: 'constructor' | 'field' | 'method';
  /** 1-based line of the member's name. */
  line: number;
  /** The member's original text, decorators and modifiers included. */
  text: string;
  /** Method/constructor body, or a field's initializer; '' when there is none. */
  body: string;
}

export interface TsClass {
  name: string;
  line: number;
  /** Names after `implements`, generic arguments removed. */
  implementsList: string[];
  members: TsMember[];
}

type Mask = 'comments' | 'commentsAndStrings';

export class TsClasses {
  /** Same length as `content`; comments (and optionally string contents) become spaces. */
  static mask(content: string, what: Mask = 'comments'): string {
    const out = content.split('');
    const blank = (from: number, to: number): void => {
      for (let k = from; k < to; k++) if (out[k] !== '\n') out[k] = ' ';
    };
    let i = 0;
    while (i < content.length) {
      const span = this.spanAt(content, i);
      if (!span) {
        i++;
        continue;
      }
      if (span.kind === 'comment') blank(i, span.end);
      else if (what === 'commentsAndStrings') blank(i + 1, span.end - 1);
      i = span.end;
    }
    return out.join('');
  }

  /** The comment or string literal starting at `i`, if one does. */
  private static spanAt(
    content: string,
    i: number
  ): { kind: 'comment' | 'string'; end: number } | null {
    const c = content[i];
    const next = content[i + 1];
    if (c === '/' && next === '/') {
      const end = content.indexOf('\n', i);
      return { kind: 'comment', end: end === -1 ? content.length : end };
    }
    if (c === '/' && next === '*') {
      const end = content.indexOf('*/', i + 2);
      return { kind: 'comment', end: end === -1 ? content.length : end + 2 };
    }
    if (c === "'" || c === '"' || c === '`') {
      return { kind: 'string', end: this.stringEnd(content, i) };
    }
    return null;
  }

  /** Every class declared in the file, with its members. */
  static parse(content: string): TsClass[] {
    const code = this.mask(content, 'commentsAndStrings');
    const classes: TsClass[] = [];
    const header = /\bclass\s+([A-Za-z_$][\w$]*)([^{;]*)\{/g;
    let match: RegExpExecArray | null;
    while ((match = header.exec(code)) !== null) {
      const open = match.index + match[0].length - 1;
      const close = this.matching(code, open);
      if (close === -1) continue;
      classes.push({
        name: match[1] ?? '',
        line: this.lineAt(content, match.index),
        implementsList: this.implementsOf(match[2] ?? ''),
        members: this.members(content, code, open, close),
      });
    }
    return classes;
  }

  /** 1-based line of an index. */
  static lineAt(content: string, index: number): number {
    let line = 1;
    for (let k = 0; k < index && k < content.length; k++) {
      if (content[k] === '\n') line++;
    }
    return line;
  }

  /** Index just past the closing quote of the string starting at `start`. */
  private static stringEnd(content: string, start: number): number {
    const quote = content[start];
    let k = start + 1;
    while (k < content.length) {
      const c = content[k];
      if (c === '\\') {
        k += 2;
        continue;
      }
      if (c === quote) return k + 1;
      if (c === '\n' && quote !== '`') return k; // unterminated
      k++;
    }
    return content.length;
  }

  /** Index of the brace matching the one at `open`, over masked code; -1 if none. */
  private static matching(code: string, open: number): number {
    let depth = 0;
    for (let k = open; k < code.length; k++) {
      if (code[k] === '{') depth++;
      else if (code[k] === '}') {
        depth--;
        if (depth === 0) return k;
      }
    }
    return -1;
  }

  private static implementsOf(headerTail: string): string[] {
    const clause = /\bimplements\s+([\s\S]*)$/.exec(headerTail)?.[1] ?? '';
    return clause
      .replace(/<[^<>]*>/g, '')
      .split(',')
      .map(name => name.trim().split('.').pop() ?? '')
      .filter(name => /^[A-Za-z_$][\w$]*$/.test(name));
  }

  private static members(
    content: string,
    code: string,
    open: number,
    close: number
  ): TsMember[] {
    const members: TsMember[] = [];
    let i = open + 1;
    while (i < close) {
      while (i < close && /\s|;/.test(code[i] ?? '')) i++;
      if (i >= close) break;
      const start = i;
      const end = this.memberEnd(code, start, close);
      const member = this.describe(content, code, start, end);
      if (member) members.push(member);
      i = Math.max(end, start + 1);
    }
    return members;
  }

  /**
   * Where the member starting at `start` ends: after the `}` of a method body,
   * or after the `;` of a field (an initializer may hold braces — an arrow
   * function, an object — so a field runs to its `;`).
   */
  private static memberEnd(code: string, start: number, close: number): number {
    let paren = 0;
    let assigned = false;
    let k = start;
    while (k < close) {
      if (code[k] === '{') {
        const after = this.afterBlock(code, k, close);
        if (after === close || (paren === 0 && !assigned)) return after;
        k = after;
        continue;
      }
      paren += this.depthDelta(code[k], '([', ')]');
      const stop = paren === 0 ? this.fieldStop(code, k, close, assigned) : -1;
      if (stop !== -1) return stop;
      assigned ||= paren === 0 && code[k] === '=' && this.isAssignment(code, k);
      k++;
    }
    return close;
  }

  /** Index just past the block whose `{` is at `k`, capped at the class's `}`. */
  private static afterBlock(code: string, k: number, close: number): number {
    const end = this.matching(code, k);
    return end === -1 || end >= close ? close : end + 1;
  }

  /** At bracket depth 0: does a field end here (`;`, or a newline before the next member)? */
  private static fieldStop(code: string, k: number, close: number, assigned: boolean): number {
    if (code[k] === ';') return k + 1;
    if (code[k] === '\n' && assigned && this.nextStartsMember(code, k, close)) {
      return k; // a field without its `;` (ASI)
    }
    return -1;
  }

  private static depthDelta(c: string | undefined, opens: string, closes: string): number {
    if (c === undefined) return 0;
    if (opens.includes(c)) return 1;
    return closes.includes(c) ? -1 : 0;
  }

  private static isAssignment(code: string, k: number): boolean {
    const before = code[k - 1] ?? '';
    const after = code[k + 1] ?? '';
    return after !== '>' && after !== '=' && !'=!<>+-*/%&|^'.includes(before);
  }

  /** After a newline: does the next line begin a new member rather than continue an expression? */
  private static nextStartsMember(code: string, k: number, close: number): boolean {
    const rest = code.slice(k + 1, close).replace(/^\s+/, '');
    return /^(?:@|(?:public|private|protected|readonly|static|async|override)\s|#?[A-Za-z_$][\w$]*\s*[(:=!?<])/.test(rest);
  }

  private static describe(
    content: string,
    code: string,
    start: number,
    end: number
  ): TsMember | null {
    const head = code.slice(start, end);
    const decorators = /^(?:@[\w$.]+\s*(?:\((?:[^()]|\([^()]*\))*\))?\s*)*/.exec(head)?.[0] ?? '';
    const modifiers =
      /^(?:(?:public|private|protected|static|readonly|async|override|declare|abstract|accessor|get|set)\s+(?=[#A-Za-z_$]))*/.exec(
        head.slice(decorators.length)
      )?.[0] ?? '';
    const nameStart = decorators.length + modifiers.length;
    const nameMatch = /^(#?[A-Za-z_$][\w$]*)\s*(\??)\s*([(<:=!;]?)/.exec(head.slice(nameStart));
    if (!nameMatch) return null;
    const name = nameMatch[1] ?? '';
    const follower = nameMatch[3] ?? '';
    const isCallable = follower === '(' || follower === '<';
    const kind: TsMember['kind'] =
      name === 'constructor' ? 'constructor' : isCallable ? 'method' : 'field';
    return {
      name,
      kind,
      line: this.lineAt(content, start + nameStart),
      text: content.slice(start, end),
      body: this.bodyOf(content, code, start, end, kind),
    };
  }

  private static bodyOf(
    content: string,
    code: string,
    start: number,
    end: number,
    kind: TsMember['kind']
  ): string {
    return kind === 'field'
      ? this.initializerOf(content, code, start, end)
      : this.blockOf(content, code, start, end);
  }

  /** A field's initializer: what follows its `=` at depth 0. */
  private static initializerOf(content: string, code: string, start: number, end: number): string {
    let depth = 0;
    for (let k = start; k < end; k++) {
      depth += this.depthDelta(code[k], '([{', ')]}');
      if (depth === 0 && code[k] === '=' && this.isAssignment(code, k)) {
        return content.slice(k + 1, end).replace(/;\s*$/, '').trim();
      }
    }
    return '';
  }

  /** A method's body: inside the first `{` outside its parameter list. */
  private static blockOf(content: string, code: string, start: number, end: number): string {
    let paren = 0;
    for (let k = start; k < end; k++) {
      if (code[k] === '{' && paren === 0) {
        const close = this.matching(code, k);
        return close === -1 ? '' : content.slice(k + 1, close);
      }
      paren += this.depthDelta(code[k], '(', ')');
    }
    return '';
  }
}
