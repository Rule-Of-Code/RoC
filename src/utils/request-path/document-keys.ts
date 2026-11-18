/**
 * The document a read call reads, as a literal collection name and an id
 * expression — precision before recall: a key is produced only when the
 * collection is written as a literal in the call and the id is one
 * expression. A module-level string constant (`USERS = "users"`, also one
 * imported from another module of the project) counts as a literal.
 *
 * - Firestore, chained (Python and Node admin):
 *   `db.collection("users").document(uid).get()` / `.doc(uid).get()`, nested
 *   paths (`collection("a").document(x).collection("b").document(y)`), and a
 *   path argument (`db.document("users/" + uid)`, f"users/{uid}",
 *   `` `users/${uid}` ``).
 * - Firestore, modular (web): `getDoc(doc(db, "users", uid))` and
 *   `getDoc(ref)` where `ref = doc(db, "users", uid)` in the same function.
 * - MongoDB: `….collection("users").find_one({"_id": x})` / `findOne({ _id: x })`,
 *   `db.users.find_one({"_id": x})`, mongoose `Model.findById(x)`.
 * - Prisma: `prisma.user.findUnique({ where: { id: x } })`.
 * - SQLAlchemy: `session.get(User, x)`; Django: `User.objects.aget(pk=x)`.
 * - A repository read by one key — an awaited read-shaped call with one
 *   argument, `users.get(uid)` — keyed by its receiver, method and argument:
 *   the same object asked the same thing twice.
 */

import type { CallArgument, CallSite } from './model';
import { splitTopLevel } from './expr-text';

/** How names in a read are resolved: a local of the same function, a string constant of the module. */
export interface KeyScope {
  local(name: string): string | null;
  constant(name: string): string | null;
}

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

/** The literal value of an argument: a string literal, or a name bound to one. */
function literalOf(arg: CallArgument | undefined, scope: KeyScope): string | null {
  if (!arg) return null;
  if (arg.literal !== null) return arg.literal;
  return IDENTIFIER.test(arg.text) ? scope.constant(arg.text) : null;
}

export interface DocumentKey {
  /** Literal collection path with `{id}` placeholders: `users/{uid}`; for a repository read, `{0}.get({1})`. */
  path: string;
  /** The id expressions, in path order. */
  ids: string[];
}

const DOC_READ_METHODS = new Set(['get', 'getDoc', 'getDocFromServer', 'getDocFromCache']);

/** `"users/" + uid`, f"users/{uid}", `users/${uid}` → segments; null when not a literal-prefixed path. */
function pathSegments(arg: CallArgument): string[] | null {
  if (arg.literal !== null) return arg.literal.split('/').filter(Boolean);
  const text = arg.text;
  const concat = /^"([^"]+)\/"\s*\+\s*(.+)$/.exec(text);
  if (concat) return [...(concat[1] as string).split('/'), `{${(concat[2] as string).trim()}}`];
  const formatted = /^(?:f"|`)([^"`]*)["`]$/.exec(text);
  if (!formatted) return null;
  return (formatted[1] as string)
    .split('/')
    .filter(Boolean)
    .map(segment => {
      const expr = /^(?:\$)?\{([^{}]+)\}$/.exec(segment);
      return expr ? `{${(expr[1] as string).trim()}}` : segment;
    });
}

/** Segments alternate collection / document; keep only a path that ends on a document. */
function keyFromSegments(segments: readonly string[]): DocumentKey | null {
  if (segments.length < 2 || segments.length % 2 !== 0) return null;
  const ids: string[] = [];
  const parts: string[] = [];
  segments.forEach((segment, i) => {
    if (i % 2 === 0) {
      parts.push(segment);
      return;
    }
    const id = /^\{(.+)\}$/.exec(segment)?.[1] ?? JSON.stringify(segment);
    ids.push(id);
    parts.push(`{${ids.length - 1}}`);
  });
  if (segments.some((s, i) => i % 2 === 0 && /[{}]/.test(s))) return null;
  return { path: parts.join('/'), ids };
}

/** Chained Firestore: `….collection(L).document(x)….get()`. */
/** The path segments one `.document(x)` / `.doc(x)` link adds. */
function documentSegments(arg: CallArgument, first: boolean): string[] {
  const path = first ? pathSegments(arg) : null;
  if (path) return path;
  return [arg.literal !== null ? arg.literal : `{${arg.text}}`];
}

function chainedFirestore(call: CallSite, scope: KeyScope): DocumentKey | null {
  if (call.method !== 'get' || call.args.length > 1) return null;
  const segments: string[] = [];
  let sawDocument = false;
  for (const link of call.chain) {
    const arg = link.args?.length === 1 ? link.args[0] : undefined;
    if (!arg) continue;
    if (link.name === 'collection') {
      const collection = literalOf(arg, scope);
      if (collection === null) return null;
      segments.push(collection);
    } else if (link.name === 'document' || link.name === 'doc') {
      segments.push(...documentSegments(arg, segments.length === 0));
      sawDocument = true;
    }
  }
  return sawDocument ? keyFromSegments(segments) : null;
}

/** `doc(db, "users", uid)` / `doc(db, "users/" + uid)` → key. */
export function modularDocKey(text: string, scope: KeyScope): DocumentKey | null {
  const m = /^doc\((.*)\)$/s.exec(text.trim());
  if (!m) return null;
  const args = splitTopLevel(m[1] as string).slice(1);
  if (args.length === 0) return null;
  const segments: string[] = [];
  for (const [i, arg] of args.entries()) {
    const literal = /^"([^"]*)"$/.exec(arg)?.[1] ?? (i % 2 === 0 && IDENTIFIER.test(arg) ? scope.constant(arg) ?? undefined : undefined);
    const path = i === 0 && args.length === 1 ? pathSegments({ text: arg, literal: literal ?? null, keyword: null }) : null;
    if (path) segments.push(...path);
    else segments.push(literal !== undefined ? literal : `{${arg}}`);
  }
  return keyFromSegments(segments);
}

function mongoKey(call: CallSite, scope: KeyScope): DocumentKey | null {
  if (call.method === 'findById' && call.args.length >= 1) {
    const model = call.receiver.split('.').pop() ?? '';
    return /^[A-Z]\w*$/.test(model) ? { path: `${model}/{0}`, ids: [call.args[0]?.text ?? ''] } : null;
  }
  if (call.method !== 'find_one' && call.method !== 'findOne') return null;
  const id = /^\{\s*"?_id"?\s*:\s*([^,{}]+?)\s*\}$/.exec(call.args[0]?.text ?? '')?.[1];
  if (!id) return null;
  const links = call.chain.slice(0, -1);
  const last = links[links.length - 1];
  if (!last) return null;
  const collection = last.name === 'collection' ? literalOf(last.args?.[0], scope) : last.args === null && links.length > 1 ? last.name : null;
  return collection ? { path: `${collection}/{0}`, ids: [id] } : null;
}

function prismaKey(call: CallSite): DocumentKey | null {
  if (!['findUnique', 'findUniqueOrThrow'].includes(call.method)) return null;
  const id = /where\s*:\s*\{\s*id\s*:\s*([^,{}]+?)\s*\}/.exec(call.args[0]?.text ?? '')?.[1];
  const model = call.chain.length >= 3 ? call.chain[call.chain.length - 2]?.name : null;
  return id && model ? { path: `${model}/{0}`, ids: [id] } : null;
}

function ormKey(call: CallSite): DocumentKey | null {
  if (call.method === 'get' && call.args.length === 2 && /^[A-Z]\w*$/.test(call.args[0]?.text ?? '') && /session/i.test(call.receiver)) {
    return { path: `${call.args[0]?.text}/{0}`, ids: [call.args[1]?.text ?? ''] };
  }
  if ((call.method === 'aget' || call.method === 'get') && /^[A-Z]\w*\.objects$/.test(call.receiver)) {
    const id = call.args.find(a => a.keyword === 'pk' || a.keyword === 'id');
    const model = call.receiver.split('.')[0];
    return id && call.args.length === 1 ? { path: `${model}/{0}`, ids: [id.text] } : null;
  }
  return null;
}

/**
 * The document a call reads. `scope.local(name)` returns the source text a
 * same-function local was bound to (`ref = doc(db, "users", uid)`).
 */
export function documentKeyOf(call: CallSite, scope: KeyScope): DocumentKey | null {
  if (DOC_READ_METHODS.has(call.method) && call.receiver === '' && call.args.length === 1) {
    const arg = call.args[0]?.text ?? '';
    const local = IDENTIFIER.test(arg) ? scope.local(arg) : null;
    return modularDocKey(local ?? arg, scope);
  }
  return chainedFirestore(call, scope) ?? mongoKey(call, scope) ?? prismaKey(call) ?? ormKey(call);
}

/** `repo.users.get(uid)`: a one-key repository read, keyed by receiver, method and argument. */
export function repositoryKeyOf(call: CallSite): DocumentKey | null {
  const arg = call.args[0];
  if (call.args.length !== 1 || !arg || arg.keyword || call.receiver === '' || /[()]/.test(call.receiver)) return null;
  return { path: `{0}.${call.method}({1})`, ids: [call.receiver, arg.text] };
}
