/**
 * Where an in-process cache lives and where it is filled: the bindings of a
 * module that may be containers, and the statements that store into one
 * (`NAME[key] = value` in Python, `NAME.set(key, value)` in TS/JS). See
 * read-caches.ts.
 */

import type { FunctionModel, ModuleModel, StatementModel } from './model';

/** The part after the last dot of a dotted name: `self.cache.get` gives `get`. */
export const lastSegment = (name: string): string =>
  name.split('.').pop() ?? name;

/** `text` escaped for use inside a regular expression. */
export const escapeRe = (text: string): string =>
  text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The raw source of a function (comments included). */
export function functionText(module: ModuleModel, fn: FunctionModel): string {
  return module.lines.slice(fn.line - 1, fn.endLine).join('\n');
}

/** A name bound to an expression, at a line. */
export interface Binding {
  name: string;
  expr: string;
  line: number;
}

const PY_MODULE_BINDING = /^([A-Za-z_]\w*)\s*(?::[^=\n]+)?=(?!=)\s*(.+?)\s*$/;
const PY_ATTRIBUTE_BINDING =
  /^((?:self|cls)\.\w+|[\w.]*\bstate\.\w+)\s*(?::[^=]+)?=(?!=)\s*(.+)$/s;
const TS_BINDING =
  /^\s*(?:export\s+)?(?:(?:const|let|var)\s+|(?:(?:private|protected|public|readonly|static|declare)\s+)*(?:this\.)?)(#?[A-Za-z_$][\w$]*)\s*(?:!?:\s*[^=]+)?=\s*(new\s+(?:Map|LRUCache)\b.*)$/;

/** The text from `start` of `lines[index]` to the end of its call: enough to read an options object. */
function ctorText(
  lines: readonly string[],
  index: number,
  start: string
): string {
  return (
    [start, ...lines.slice(index + 1, index + 8)]
      .join('\n')
      .split(/\)\s*;?\s*$/m)[0] ?? start
  );
}

/** Module-level and attribute bindings (Python), and `new Map`/`new LRUCache` bindings (TS/JS). */
export function containerBindings(module: ModuleModel): Binding[] {
  if (module.language === 'typescript') {
    return module.lines.flatMap((text, index) => {
      const m = TS_BINDING.exec(text);
      return m
        ? [
            {
              name: m[1] as string,
              expr: ctorText(module.lines, index, m[2] as string),
              line: index + 1,
            },
          ]
        : [];
    });
  }
  const top = module.lines.flatMap((text, index) => {
    const m = /^\S/.test(text)
      ? PY_MODULE_BINDING.exec(text.replace(/\s+#.*$/, ''))
      : null;
    return m
      ? [{ name: m[1] as string, expr: m[2] as string, line: index + 1 }]
      : [];
  });
  const attributes = module.functions.flatMap(fn =>
    fn.blocks.flat().flatMap(statement => {
      const m = statement.simple
        ? PY_ATTRIBUTE_BINDING.exec(statement.text)
        : null;
      return m
        ? [{ name: m[1] as string, expr: m[2] as string, line: statement.line }]
        : [];
    })
  );
  return [...top, ...attributes];
}

/** One statement that stores a value under a key in a container. */
export interface Store {
  fn: FunctionModel;
  statement: StatementModel;
  line: number;
  key: string;
  value: string;
}

/** `NAME[key] = value` (Python) or `NAME.set(key, value)` (TS/JS), with NAME as the last segment of the target. */
export function storesInto(module: ModuleModel, name: string): Store[] {
  const segment = escapeRe(lastSegment(name));
  if (module.language === 'python') {
    const target = new RegExp(
      String.raw`^(?:[\w]+\.)*${segment}\s*\[(.+)\]\s*=(?!=)\s*(.+)$`,
      's'
    );
    return module.functions.flatMap(fn =>
      fn.blocks.flat().flatMap(statement => {
        const m = statement.simple ? target.exec(statement.text) : null;
        return m
          ? [
              {
                fn,
                statement,
                line: statement.line,
                key: (m[1] as string).trim(),
                value: (m[2] as string).trim(),
              },
            ]
          : [];
      })
    );
  }
  return module.functions.flatMap(fn =>
    fn.calls
      .filter(
        call =>
          call.method === 'set' &&
          call.args.length >= 2 &&
          lastSegment(call.receiver) === lastSegment(name)
      )
      .flatMap(call => {
        const statement = fn.blocks
          .flat()
          .find(s => call.line >= s.line && call.line <= s.endLine);
        return statement
          ? [
              {
                fn,
                statement,
                line: call.line,
                key: call.args[0]?.text ?? '',
                value: call.args[1]?.text ?? '',
              },
            ]
          : [];
      })
  );
}
