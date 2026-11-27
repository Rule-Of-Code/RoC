import { capturesErrors } from '../../../../checkers/code-quality-laws/global-error-handlers';
import type { RuleOfCodeConfig } from '../../../../config/types';
import { CheckerUtils } from '../../../../utils/checker-utils';
import { scriptText, VUE_EXTENSION } from '../../../../utils/vue/vue-sfc';
import { FileUtils } from '../../../../utils/file-utils';
import {
  importedNames,
  namespaceNames,
} from '../../../../utils/react/next-module-bindings';
import {
  loadTypeScript,
  parserUnavailable,
  TsxSource,
} from '../../../../utils/react/tsx-source';
import type * as TS from 'typescript';

/** Errors the project captures with its own code, and what could not be read. */
export interface OwnErrorCapture {
  /** `src/app/app.config.ts` — files that register a handler. */
  files: string[];
  /** Not-read notes, for the law's "NOT read" violation. */
  unread: string[];
}

/** Only these files can hold a handler; the rest are not parsed. */
const MAY_CAPTURE =
  /[Ee]rrorHandler|onerror|addEventListener|\.(?:on|once)\s*\(/;

/** Vue's app factories: `app.config.errorHandler` on what they return captures errors (#12). */
const VUE_APP_FACTORIES = ['createApp', 'createSSRApp'];
/** App methods that return the app itself, so `createApp(App).use(router)` is still the app. */
const VUE_APP_CHAIN = new Set([
  'use',
  'component',
  'directive',
  'provide',
  'mixin',
]);

/** Whether `node` is a Vue app: a factory call imported from vue, possibly through app-returning methods. */
function isVueApp(
  ts: TsxSource['ts'],
  node: TS.Expression,
  factories: ReadonlySet<string>,
  namespaces: ReadonlySet<string>
): boolean {
  if (!ts.isCallExpression(node)) return false;
  const callee = node.expression;
  if (ts.isIdentifier(callee)) return factories.has(callee.text);
  if (!ts.isPropertyAccessExpression(callee)) return false;
  if (
    ts.isIdentifier(callee.expression) &&
    namespaces.has(callee.expression.text)
  ) {
    return VUE_APP_FACTORIES.includes(callee.name.text);
  }
  return (
    VUE_APP_CHAIN.has(callee.name.text) &&
    isVueApp(ts, callee.expression, factories, namespaces)
  );
}

/**
 * `app.config.errorHandler = …` on a Vue app (#12): the app is the value of a
 * createApp / createSSRApp call imported from 'vue' (named, aliased or through
 * a namespace), held in a variable or written inline. An `errorHandler`
 * assigned on any other object, or named in a comment or a string, is not.
 */
export function setsVueErrorHandler(source: TsxSource): boolean {
  const ts = source.ts;
  const factories = new Set(
    VUE_APP_FACTORIES.flatMap(name => [...importedNames(source, ['vue'], name)])
  );
  const namespaces = namespaceNames(source, 'vue');
  if (factories.size === 0 && namespaces.size === 0) return false;

  const apps = new Set<string>();
  source.walk(node => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      isVueApp(ts, node.initializer, factories, namespaces)
    ) {
      apps.add(node.name.text);
    }
  });

  let found = false;
  source.walk(node => {
    if (
      found ||
      !ts.isBinaryExpression(node) ||
      node.operatorToken.kind !== ts.SyntaxKind.EqualsToken
    ) {
      return;
    }
    const target = node.left;
    if (
      !ts.isPropertyAccessExpression(target) ||
      target.name.text !== 'errorHandler'
    ) {
      return;
    }
    const config = target.expression;
    if (
      !ts.isPropertyAccessExpression(config) ||
      config.name.text !== 'config'
    ) {
      return;
    }
    const app = config.expression;
    found =
      (ts.isIdentifier(app) && apps.has(app.text)) ||
      isVueApp(ts, app, factories, namespaces);
  });
  return found;
}

function relative(projectRoot: string, file: string): string {
  return file
    .slice(projectRoot.length)
    .replace(/^[\\/]+/, '')
    .replace(/\\/g, '/');
}

/**
 * An own error handler in the production sources (#553): an Angular
 * ErrorHandler provider wherever it is registered (app.config.ts,
 * bootstrapApplication's providers, a `provide…ErrorHandler()` helper), or a
 * window / process error listener — read with the detector Global Error
 * Handlers uses. Until #553 the law looked for the word `ErrorHandler` in
 * src/app/app.module.ts and src/app/app.component.ts only, which a
 * standalone app does not have.
 */
export function ownErrorCapture(
  projectRoot: string,
  config?: RuleOfCodeConfig,
  lawId?: string
): OwnErrorCapture {
  const candidates: Array<{ file: string; text: string }> = [];
  // A component's <script> too: the parse reads a .vue file by its script,
  // and so does the prefilter (#607).
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
    const text = FileUtils.readFileContentSync(file);
    if (text && MAY_CAPTURE.test(scriptText(file, text)))
      candidates.push({ file, text });
  }
  if (candidates.length === 0) return { files: [], unread: [] };

  const ts = loadTypeScript(projectRoot);
  if (!ts) {
    return {
      files: [],
      unread: [
        `${candidates.length} file(s): ${parserUnavailable(projectRoot, 'the files that may register an error handler')}`,
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
        `${relative(projectRoot, file)}: could not be parsed (${syntaxError}) — its code was NOT read`
      );
    } else if (
      capturesErrors(ts, source.sourceFile) ||
      setsVueErrorHandler(source)
    ) {
      files.push(relative(projectRoot, file));
    }
  }
  return { files, unread };
}
