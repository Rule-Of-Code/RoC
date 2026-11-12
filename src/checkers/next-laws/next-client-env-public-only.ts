/**
 * Next Client Env Public Only
 *
 * In code bundled for the browser, Next replaces a `process.env.X` whose name
 * lacks the NEXT_PUBLIC_ prefix with an empty string
 * (next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md).
 * The client code runs, with a blank value, and nothing fails — the feature
 * flag is off, the API URL is empty, and no test that runs on the server
 * notices.
 *
 * Every module in a client graph (see Next Server Only Boundary) is read;
 * `process.env.X`, `process.env['X']` and a name destructured from
 * `process.env` (`const { X } = process.env`) must name NEXT_PUBLIC_*,
 * NODE_ENV, or a key of the literal `env` object in next.config — those three
 * Next inlines. Computed access, and destructuring as such (never inlined,
 * whatever the name), are Next Public Env Is Build Time's concern.
 */

import type * as TS from 'typescript';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { clientGraph, type EnvRead, envReads, type NextModuleGraph } from '../../utils/react/next-module-graph';
import { FileSystemOperations } from '../../utils/file-system-operations';
import { PathOperations } from '../../utils/path-operations';
import { ReactProject, type NextApp } from '../../utils/react/react-project';
import { unwrap } from '../../utils/react/module-exports';
import { LawBase } from '../law-base';
import { readProject } from './next-server-support';

const NEXT_CONFIG_FILES = ['next.config.ts', 'next.config.mts', 'next.config.js', 'next.config.mjs', 'next.config.cjs'];

/** Names Next inlines into the client bundle whatever their prefix. */
const ALWAYS_INLINED = new Set(['NODE_ENV']);

interface ConfigEnv {
  keys: Set<string>;
  /** next.config files whose `env` is not a literal object. */
  unreadable: string[];
}

export class NextClientEnvPublicOnlyLaw extends LawBase {
  static readonly LAW_NAME = 'Next Client Env Public Only';

  static check(context: LawCheckContext): LawResult {
    const { graph, unread } = readProject(context);
    if (!graph) return this.result(unread, context);
    const apps = ReactProject.nextApps(context.projectRoot);
    const client = clientGraph(graph, apps);
    const configEnv = this.configEnv(graph, apps);
    const caveat = configEnv.unreadable.length
      ? ` (the env of ${configEnv.unreadable.join(', ')} is not a literal object and was not read)`
      : '';
    const violations: string[] = [];
    for (const [file, visit] of client.modules) {
      for (const read of envReads(visit.source)) {
        if (!read.name || read.name.startsWith('NEXT_PUBLIC_') || ALWAYS_INLINED.has(read.name)) continue;
        if (configEnv.keys.has(read.name)) continue;
        violations.push(
          `${graph.relative(file)}:${read.line}: ${read.text} is read in browser code (through ${graph.chain(client.modules, file)}) — ${this.inBrowser(read)}${caveat}. Read it on the server and pass the value down, or rename it NEXT_PUBLIC_ if it is public`
        );
      }
    }
    violations.push(...client.unresolved.map(item => graph.describeUnresolved(item)), ...graph.unread);
    return this.result(violations, context);
  }

  /** What the browser sees: a destructured name is not inlined at all. */
  private static inBrowser(read: EnvRead): string {
    return read.inlined
      ? 'Next replaces it with an empty string there'
      : 'Next does not inline a destructured read, so it is undefined there';
  }

  private static result(violations: string[], context: LawCheckContext): LawResult {
    return this.createResult(
      violations,
      this.LAW_NAME,
      'FRAMEWORK',
      [
        'Read server-only environment variables in a Server Component, route handler or action, and pass the value down',
        'Prefix a variable NEXT_PUBLIC_ only when its value may be seen by every visitor',
      ],
      context
    );
  }

  /** The keys of the literal `env` object of each app's next.config. */
  private static configEnv(graph: NextModuleGraph, apps: readonly NextApp[]): ConfigEnv {
    const result: ConfigEnv = { keys: new Set(), unreadable: [] };
    for (const app of apps) {
      for (const name of NEXT_CONFIG_FILES) {
        const file = PathOperations.join(app.root, name);
        if (!FileSystemOperations.isFile(file)) continue;
        const source = graph.source(file);
        if (!source) continue;
        const ts = source.ts;
        source.walk(node => {
          if (!ts.isPropertyAssignment(node) || node.name.getText(source.sourceFile) !== 'env') return;
          const value = unwrap(ts, node.initializer);
          if (!ts.isObjectLiteralExpression(value)) {
            result.unreadable.push(graph.relative(file));
            return;
          }
          for (const property of value.properties) {
            const key = this.propertyName(ts, property);
            if (key) result.keys.add(key);
          }
        });
      }
    }
    return result;
  }

  private static propertyName(ts: typeof TS, property: TS.ObjectLiteralElementLike): string | null {
    if (!property.name) return null;
    if (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)) return property.name.text;
    return null;
  }
}
