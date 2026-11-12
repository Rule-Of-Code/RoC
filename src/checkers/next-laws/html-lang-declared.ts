/**
 * HTML Lang Declared
 *
 * Without `lang` on `<html>` a screen reader guesses the language of every
 * page — and reads it with the wrong voice and pronunciation rules — and the
 * browser offers to translate a page that is already in the reader's
 * language (WCAG 2.x SC 3.1.1, Language of Page). In a Next app it is one
 * attribute in one place: the root layout's `<html>` (App Router), or the
 * `<Html>` of `pages/_document` (Pages Router), where Next fills it from the
 * i18n locale when `i18n` is configured.
 */

import * as fs from 'fs';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { PathOperations } from '../../utils/path-operations';
import { importedNames, NextAppFiles } from '../../utils/react/next-app-files';
import { type NextSources, NextSourcesLoader } from '../../utils/react/next-sources';
import { type NextApp, ReactProject } from '../../utils/react/react-project';
import { jsxAttribute, type JsxElementInfo, loadTypeScript, TsxSource } from '../../utils/react/tsx-source';
import { LawBase } from '../law-base';

const NEXT_CONFIG_FILES = ['next.config.js', 'next.config.mjs', 'next.config.cjs', 'next.config.ts', 'next.config.mts'];

export class HtmlLangDeclaredLaw extends LawBase {
  static readonly LAW_NAME = 'HTML Lang Declared';

  static check(context: LawCheckContext): LawResult {
    const sources = NextSourcesLoader.load(context, ['.tsx', '.jsx', '.js']);
    const violations = [...sources.unread];
    if (!NextSourcesLoader.hasRouter(sources)) violations.push(NextAppFiles.noRouterDirectory(context));
    violations.push(...this.appRouter(context, sources), ...this.pagesRouter(context, sources));
    return this.createResult(
      violations,
      this.LAW_NAME,
      'ACCESSIBILITY',
      [
        'App Router: <html lang="en"> in the root layout (lang={locale} under a [locale] segment)',
        'Pages Router: <Html lang="en"> in pages/_document, or configure i18n in next.config',
      ],
      context
    );
  }

  /** `lang` written with a non-empty literal or any expression. */
  static langProblem(element: JsxElementInfo): string | null {
    const lang = jsxAttribute(element, 'lang');
    if (lang && lang.value.trim() !== '') return null;
    if (!lang && element.hasSpread) {
      return `<${element.tag}> has no lang (a {...spread} may set it, but this file cannot show it — write it explicitly)`;
    }
    return lang ? `<${element.tag}> has an empty lang` : `<${element.tag}> has no lang`;
  }

  private static appRouter(context: LawCheckContext, sources: NextSources): string[] {
    return sources.apps.flatMap(app => app.appDirs.flatMap(appDir => this.appDirProblems(context, sources, appDir)));
  }

  private static appDirProblems(context: LawCheckContext, sources: NextSources, appDir: string): string[] {
    const files = sources.appFiles.filter(appFile => appFile.appDir === appDir);
    const violations: string[] = [];
    let rootLayouts = 0;
    for (const appFile of files) {
      const source = sources.parsed.get(appFile.file);
      const htmls = source ? source.jsxElements().filter(element => element.tag === 'html') : [];
      if (appFile.kind === 'layout' && htmls.length > 0) rootLayouts++;
      const where = ReactProject.relative(context, appFile.file);
      for (const element of htmls) {
        const problem = this.langProblem(element);
        if (problem) violations.push(`${where}:${element.line}: ${problem} — screen readers guess the page language`);
      }
    }
    if (rootLayouts === 0 && files.some(appFile => appFile.kind === 'page')) {
      violations.push(
        `${ReactProject.relative(context, appDir)}: no layout under this app directory renders <html> — the root layout's lang was not found, so it was not checked`
      );
    }
    return violations;
  }

  private static pagesRouter(context: LawCheckContext, sources: NextSources): string[] {
    const violations: string[] = [];
    for (const app of sources.apps) {
      if (app.pagesDirs.length === 0) continue;
      const documents = sources.pagesFiles.filter(page => page.app === app && page.special === '_document');
      const routed = sources.pagesFiles.some(page => page.app === app && !page.api && !page.special);
      if (documents.length === 0) {
        if (routed && !this.configuresI18n(context, app)) {
          violations.push(
            `${ReactProject.relative(context, app.pagesDirs[0] ?? app.root)}: no _document and no i18n in next.config — Next renders <html> without lang`
          );
        }
        continue;
      }
      for (const document of documents) violations.push(...this.documentProblems(context, sources, document.file));
    }
    return violations;
  }

  private static documentProblems(context: LawCheckContext, sources: NextSources, file: string): string[] {
    const source = sources.parsed.get(file);
    if (!source) return [];
    const htmlTags = importedNames(source, ['next/document'], 'Html');
    const where = ReactProject.relative(context, file);
    const htmls = source.jsxElements().filter(element => htmlTags.has(element.tag) || element.tag === 'html');
    if (htmls.length === 0) {
      return [`${where}: renders no <Html> from next/document — the document's lang was not found, so it was not checked`];
    }
    return htmls
      .map(element => ({ element, problem: this.langProblem(element) }))
      .filter(({ problem }) => problem !== null && !this.configuresI18n(context, this.appOf(sources, file)))
      .map(({ element, problem }) => `${where}:${element.line}: ${problem} — screen readers guess the page language`);
  }

  private static appOf(sources: NextSources, file: string): NextApp | undefined {
    return sources.pagesFiles.find(page => page.file === file)?.app;
  }

  /** An `i18n` key anywhere in the app's next.config: Next then sets lang from the locale. */
  static configuresI18n(context: LawCheckContext, app: NextApp | undefined): boolean {
    if (!app) return false;
    const ts = loadTypeScript(context.projectRoot);
    if (!ts) return false;
    for (const name of NEXT_CONFIG_FILES) {
      const file = PathOperations.join(app.root, name);
      if (!fs.existsSync(file)) continue;
      const source = TsxSource.parse(ts, file, fs.readFileSync(file, 'utf8'));
      let found = false;
      source.walk(node => {
        if (ts.isPropertyAssignment(node) || ts.isShorthandPropertyAssignment(node)) {
          if (node.name.getText(source.sourceFile) === 'i18n') found = true;
        }
      });
      if (found) return true;
    }
    return false;
  }
}
