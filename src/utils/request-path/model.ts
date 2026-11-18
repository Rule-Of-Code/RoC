/**
 * The shape the request-path laws read, whatever the source language.
 *
 * Python and TypeScript are parsed by different front ends (a structural
 * reader of logical lines and indented blocks for Python, the TypeScript
 * compiler for TS/JS), and both produce this model: modules of functions,
 * each with its statement lists, its awaited calls, the awaited calls that
 * sit inside a loop of that same function, and every call it makes. The laws
 * are written once against it.
 *
 * Positions are 1-based source lines. Source text in the model is
 * normalised: whitespace runs collapse to one space, string literals are
 * written with double quotes, and TypeScript's `?.` / `!` are dropped, so the
 * same expression compares equal however it was formatted.
 */

/** One argument of a call, as written (normalised) and, for a plain string literal, its value. */
export interface CallArgument {
  text: string;
  /** The value of a plain string literal argument; null for anything else. */
  literal: string | null;
  /** `name=value` (Python) — the keyword; null for a positional argument. */
  keyword: string | null;
}

/** One link of a call chain: `.collection("users")` is `{ name: 'collection', args: [...] }`. */
export interface ChainLink {
  name: string;
  /** Null when the link is not called (`db` in `db.collection(...)`). */
  args: CallArgument[] | null;
}

/** One call expression. */
export interface CallSite {
  line: number;
  /** The called expression: `self.repo.get`, `db.collection("users").document(uid).get`. */
  callee: string;
  /** The last name of the callee: `get`, `getDocs`, `gather`. */
  method: string;
  /** The callee without its last link; '' for a bare function name. */
  receiver: string;
  args: CallArgument[];
  /** The callee split into links, outermost first. */
  chain: ChainLink[];
  /** Normalised text of the whole call. */
  text: string;
  /** Names the call reads (receiver and arguments): roots and dotted chains. */
  names: string[];
}

/** One `await` (or one iteration step of an `async for` / `for await`). */
export interface AwaitSite {
  line: number;
  /** The awaited call; null when the awaited expression is not a call. */
  call: CallSite | null;
  /** Another await sits inside this one's operand. */
  nested: boolean;
  /** The iterable of `async for` / `for await`: every iteration is a round trip. */
  asyncIteration: boolean;
}

/** One statement of a statement list. */
export interface StatementModel {
  line: number;
  endLine: number;
  /**
   * An expression, an assignment or a `return`. Anything else (if, for, try,
   * with, a nested def) is compound: it changes control flow, so it ends a
   * run of sequential awaits.
   */
  simple: boolean;
  /** Outermost awaits of the statement (the header only, for a compound statement). */
  awaits: AwaitSite[];
  /** Names the statement binds: assignment targets, unpacking, walrus, `as`, `for` targets. */
  bound: string[];
  /** Names the statement reads. */
  used: string[];
  /** Names bound to a fresh mutable value (`x = []`, `const m = new Map()`). */
  mutableBindings: string[];
  text: string;
}

/** An awaited call that runs once per iteration of a loop in the same function. */
export interface LoopAwait {
  loopLine: number;
  /** `for`, `async for`, `while`, `comprehension`, `for-of`, `for await`, `for-in`, `do`, `forEach`. */
  loopKind: string;
  /**
   * The loop runs a count fixed in the source — over a literal tuple/array
   * (`for side in ("a", "b")`) or a literal bound (`range(3)`, `i < 3`): a
   * fixed fan-out, not one round trip per item of data.
   */
  fixedCount: boolean;
  site: AwaitSite;
}

/** One function or method. */
export interface FunctionModel {
  /** `name`, or `Class.name` for a method. */
  name: string;
  /** The bare name a caller uses. */
  shortName: string;
  line: number;
  endLine: number;
  isAsync: boolean;
  params: string[];
  /** Every statement list of the body, nested blocks included, nested functions excluded. */
  blocks: StatementModel[][];
  loopAwaits: LoopAwait[];
  /** Every call in the body, nested functions excluded. */
  calls: CallSite[];
  /** Every name the body reads, with how many times (nested functions excluded). */
  nameUses: Map<string, number>;
  /** The body runs inside a database transaction (decorator, callback or parameter). */
  transactional: boolean;
}

/** A name a module imports from another module. */
export interface ImportBinding {
  local: string;
  /** The module specifier as written (`app.services.users`, `./users`, `.users`). */
  module: string;
  /** The imported name; null when the binding is the module itself. */
  imported: string | null;
}

export type SourceLanguage = 'python' | 'typescript';

export interface ModuleModel {
  /** Absolute path. */
  file: string;
  /** Project-relative path with forward slashes. */
  rel: string;
  language: SourceLanguage;
  functions: FunctionModel[];
  imports: ImportBinding[];
  /** The raw source lines (comments included), for line markers. */
  lines: string[];
}
