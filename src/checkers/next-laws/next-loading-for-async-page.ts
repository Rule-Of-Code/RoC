/**
 * Next Loading For Async Page
 *
 * An async page awaits its data before it can render. With no Suspense
 * boundary above it, navigation to it shows nothing new until the await
 * settles — the click seems ignored. A `loading` file wraps the page of its
 * segment and every segment below it in `<Suspense>`, and a `<Suspense>` in
 * the page does the same for the part it wraps. The law cannot tell a slow
 * page from a fast one, hence `info`.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import {
  exportedBindings,
  importedNames,
  isAsyncFunction,
  namespaceNames,
  NextAppFiles,
} from '../../utils/react/next-app-files';
import { NextSourcesLoader } from '../../utils/react/next-sources';
import { ReactProject } from '../../utils/react/react-project';
import type { TsxSource } from '../../utils/react/tsx-source';
import { LawBase } from '../law-base';

export class NextLoadingForAsyncPageLaw extends LawBase {
  static readonly LAW_NAME = 'Next Loading For Async Page';

  static check(context: LawCheckContext): LawResult {
    const sources = NextSourcesLoader.load(context);
    if (!NextSourcesLoader.hasAppRouter(sources) && sources.unread.length === 0) {
      return NextAppFiles.withoutSubject(this.LAW_NAME, 'no app/ directory — loading files and async Server Component pages exist only in the App Router', context);
    }
    const violations = [...sources.unread];
    for (const page of NextAppFiles.pages(sources.appFiles)) {
      const source = sources.parsed.get(page.file);
      if (!source || !this.isAsyncPage(source) || this.rendersSuspense(source)) continue;
      const covered = NextAppFiles.segmentChain(page.appDir, page.segmentDir).some(dir =>
        NextAppFiles.specialIn(sources.appFiles, dir, 'loading')
      );
      if (covered) continue;
      violations.push(
        `${ReactProject.relative(context, page.file)} (${NextAppFiles.routeOf(page.appDir, page.segmentDir)}): async page with no loading file in its segment or above, and no <Suspense> — navigation shows nothing until its data arrives`
      );
    }
    return this.createResult(
      violations,
      this.LAW_NAME,
      'PERFORMANCE',
      [
        'Add loading.tsx beside the page (or in a parent segment) with a skeleton',
        'Or wrap the awaited part of the page in <Suspense fallback={…}>',
      ],
      context
    );
  }

  /** The default export is an async function. */
  static isAsyncPage(source: TsxSource): boolean {
    return isAsyncFunction(source.ts, exportedBindings(source).get('default')?.value);
  }

  /** A `<Suspense>` from react, by its imported name or through the React namespace. */
  static rendersSuspense(source: TsxSource): boolean {
    const names = importedNames(source, ['react'], 'Suspense');
    const namespaces = namespaceNames(source, 'react');
    return source.jsxElements().some(element => {
      if (names.has(element.tag)) return true;
      const [namespace, member] = element.tag.split('.');
      return member === 'Suspense' && namespace !== undefined && namespaces.has(namespace);
    });
  }
}
