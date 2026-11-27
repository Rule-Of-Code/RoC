/**
 * Performance tracing, for Performance Monitoring Standards (#12, b4): a
 * Sentry SDK initialised with tracing, read from the syntax tree.
 *
 * The check it replaces looked in three fixed files (src/app/app.module.ts,
 * src/main.ts, sentry.config.js) for the substrings `tracesSampleRate`,
 * `performance` or `tracingOrigins` — so an `@angular/fire/performance`
 * import passed it, and the files Sentry's own guides use (an instrument
 * file imported first in a React app, Next.js's instrumentation-client /
 * sentry.server.config / sentry.edge.config) were never read.
 *
 * Now every source file of the project is a candidate (tests, dependencies
 * and build output excluded by the scan, config ignores honoured). A file is
 * parsed only when its script text contains `@sentry/`; in it, a call to the
 * SDK's `init` — `Sentry.init(…)` through a namespace, default or `require`
 * binding, or a named `init` import — whose first argument is an object with
 * one of the tracing options counts. Error tracking without tracing is not
 * this check's: Performance Monitoring Policy judges it.
 */

import type * as TS from 'typescript';
import type { RuleOfCodeConfig } from '../../../../config/types';
import { CheckerUtils } from '../../../../utils/checker-utils';
import { FileUtils } from '../../../../utils/file-utils';
import { JsConfigSource } from '../../../../utils/react/js-config-source';
import { importedNames } from '../../../../utils/react/next-module-bindings';
import { REACT_TEST_FILE } from '../../../../utils/react/react-project';
import {
  loadTypeScript,
  parserUnavailable,
  TsxSource,
} from '../../../../utils/react/tsx-source';
import { SENTRY_BROWSER_SDKS } from '../../../../utils/sentry-browser-sdks';
import { scriptText, VUE_EXTENSION } from '../../../../utils/vue/vue-sfc';

/** The SDKs whose `init` can start tracing: the browser list and the Node SDK. */
export const SENTRY_TRACING_MODULES: readonly string[] = [
  ...SENTRY_BROWSER_SDKS,
  '@sentry/node',
];

/** The Sentry.init options that turn tracing on (tracingOrigins: older SDKs). */
export const TRACING_OPTIONS: readonly string[] = [
  'tracesSampleRate',
  'tracesSampler',
  'tracePropagationTargets',
  'tracingOrigins',
];

/** What the scan found: files that start Sentry tracing, and files it could not read. */
export interface PerformanceTracing {
  files: string[];
  unread: string[];
}

function relative(projectRoot: string, file: string): string {
  return file
    .slice(projectRoot.length)
    .replace(/^[\\/]+/, '')
    .replace(/\\/g, '/');
}

/** The name of an object-literal member, when it is a plain identifier or string. */
function memberName(
  ts: typeof TS,
  member: TS.ObjectLiteralElementLike
): string | null {
  const name = member.name;
  if (!name) return null;
  if (ts.isIdentifier(name) || ts.isStringLiteral(name)) return name.text;
  return null;
}

/** Whether `source` calls a Sentry SDK's init with a tracing option. */
export function startsSentryTracing(source: TsxSource): boolean {
  const ts = source.ts;
  const namespaces = new Set<string>();
  const inits = new Set<string>();
  for (const module of SENTRY_TRACING_MODULES) {
    for (const name of JsConfigSource.importedNames(source, module))
      namespaces.add(name);
    for (const name of importedNames(source, [module], 'init')) inits.add(name);
  }
  if (namespaces.size === 0) return false;

  let found = false;
  source.walk(node => {
    if (found || !ts.isCallExpression(node)) return;
    const callee = node.expression;
    const isInit =
      (ts.isIdentifier(callee) &&
        (inits.has(callee.text) ||
          (callee.text === 'init' && namespaces.has('init')))) ||
      (ts.isPropertyAccessExpression(callee) &&
        callee.name.text === 'init' &&
        ts.isIdentifier(callee.expression) &&
        namespaces.has(callee.expression.text));
    if (!isInit) return;
    const options = node.arguments[0];
    if (!options || !ts.isObjectLiteralExpression(options)) return;
    found = options.properties.some(member => {
      const name = memberName(ts, member);
      return name !== null && TRACING_OPTIONS.includes(name);
    });
  });
  return found;
}

/** Every source file that initialises a Sentry SDK with tracing, and what could not be read. */
export function sentryTracingInits(
  projectRoot: string,
  config?: RuleOfCodeConfig,
  lawId?: string
): PerformanceTracing {
  const candidates: Array<{ file: string; text: string }> = [];
  for (const file of CheckerUtils.findFilesByExtension(
    projectRoot,
    [
      ...CheckerUtils.getCommonExtensions().ALL_CODE,
      '.mjs',
      '.cjs',
      VUE_EXTENSION,
    ],
    config ?? FileUtils.getMinimalDefaultConfig(),
    lawId
  )) {
    if (REACT_TEST_FILE.test(file.replace(/\\/g, '/'))) continue;
    const text = FileUtils.readFileContentSync(file);
    if (text && scriptText(file, text).includes('@sentry/'))
      candidates.push({ file, text });
  }
  if (candidates.length === 0) return { files: [], unread: [] };

  const ts = loadTypeScript(projectRoot);
  if (!ts) {
    return {
      files: [],
      unread: [
        `${candidates.length} file(s): ${parserUnavailable(projectRoot, 'the files that import a Sentry SDK')}`,
      ],
    };
  }

  const files: string[] = [];
  const unread: string[] = [];
  for (const { file, text } of candidates) {
    const source = TsxSource.parse(ts, file, text);
    const [syntaxError] = source.parseErrors();
    if (syntaxError) {
      unread.push(
        `${relative(projectRoot, file)}: could not be parsed (${syntaxError}) — its Sentry.init was NOT read`
      );
    } else if (startsSentryTracing(source)) {
      files.push(relative(projectRoot, file));
    }
  }
  return { files, unread };
}
