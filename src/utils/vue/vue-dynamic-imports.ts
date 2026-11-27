/**
 * Dynamic `import()` calls in a Vue workspace's own sources (#12).
 *
 * The same rule the React path applies (ReactPerformanceSource.callMeaning):
 * every call whose callee is the `import` keyword is lazy-loaded code,
 * whatever module it loads — a Vue Router lazy route
 * (`component: () => import('./views/X.vue')`), `defineAsyncComponent(() =>
 * import(…))` and an on-demand `import('chart.js').then(…)` alike. It is read
 * from the syntax tree, so an `import(` in a comment or a string is not a
 * call; a `.vue` file is read by its `<script>` / `<script setup>` (the
 * template is not code). Each call is reported as `file:line import()`, the
 * format of ReactPerformanceEvidence.dynamicImports.
 *
 * A Vue workspace declares `vue` or `nuxt` in a workspace manifest and
 * neither `react` nor `next`: those are the React path's, which reads the
 * same rule from its own scan. Angular declares none of them.
 */

import type { LawCheckContext, RuleOfCodeConfig } from '../../types/law.types';
import { ReactProject, REACT_SOURCE_EXTENSIONS } from '../react/react-project';
import { WorkspaceManifests } from '../workspace-manifests';
import { VUE_EXTENSION } from './vue-sfc';

/** What the Vue scan found: lazy-loaded code, and the files it could not read. */
export interface VueDynamicImportEvidence {
  /** Whether the workspace is a Vue one (and not React's). */
  applies: boolean;
  /** `src/router/index.ts:9 import()`, one per call. */
  dynamicImports: string[];
  /** Files that could not be read or parsed. */
  unread: string[];
}

/** Whether `projectRoot` is a Vue workspace that is not a React one. */
export function isVueWorkspace(projectRoot: string): boolean {
  const declares = (name: string): boolean =>
    WorkspaceManifests.declares(projectRoot, name);
  return (
    (declares('vue') || declares('nuxt')) &&
    !declares('react') &&
    !declares('next')
  );
}

export class VueDynamicImports {
  static scan(context: LawCheckContext): VueDynamicImportEvidence {
    if (!isVueWorkspace(context.projectRoot)) {
      return { applies: false, dynamicImports: [], unread: [] };
    }
    // As the React scan does: a law run without a config still scans.
    const scanContext: LawCheckContext = {
      ...context,
      config: context.config ?? ({} as RuleOfCodeConfig),
    };
    const parsed = ReactProject.parse(
      scanContext,
      ReactProject.sourceFiles(scanContext, [
        ...REACT_SOURCE_EXTENSIONS,
        VUE_EXTENSION,
      ])
    );
    const dynamicImports: string[] = [];
    for (const source of parsed.sources) {
      const ts = source.ts;
      const file = ReactProject.relative(scanContext, source.fileName);
      source.walk(node => {
        if (
          ts.isCallExpression(node) &&
          node.expression.kind === ts.SyntaxKind.ImportKeyword
        ) {
          dynamicImports.push(`${file}:${source.lineOf(node)} import()`);
        }
      });
    }
    return { applies: true, dynamicImports, unread: parsed.unread };
  }
}
