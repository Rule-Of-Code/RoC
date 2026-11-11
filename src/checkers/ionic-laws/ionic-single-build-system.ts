/**
 * Ionic Single Build System
 *
 * @ionic/angular ships two builds behind two entry points: `@ionic/angular`
 * (IonicModule and the lazy loader from @ionic/core/loader) and
 * `@ionic/angular/standalone` (one standalone component per element, plus
 * provideIonicAngular). Each entry declares its own ModalController,
 * IonRouterOutlet, IonModal and every component — different classes, so
 * different DI tokens. Only what both re-export from `@ionic/angular/common`
 * (NavController, Platform, Config, NavParams, IonicRouteStrategy, …) is the
 * same class in both. Ionic's docs: the two "cannot be used at the same time".
 *
 * The shared set is not hard-coded: it is read from the installed
 * `@ionic/angular` entry's `export { … } from '@ionic/angular/common'`
 * statements, with the project's own TypeScript. A project that mixes the
 * entries and whose installed package cannot be read is reported as not
 * judged, never passed.
 */

import * as fs from 'fs';
import type * as TS from 'typescript';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { AngularComponents } from '../../utils/ionic/angular-components';
import { withNotes } from '../../utils/ionic/law-notes';
import { PathOperations } from '../../utils/path-operations';
import { TsxSource, type TypeScriptModule } from '../../utils/react/tsx-source';
import { LawBase } from '../law-base';

const MODULE_ENTRY = '@ionic/angular';
const STANDALONE_ENTRY = '@ionic/angular/standalone';
const COMMON_ENTRY = '@ionic/angular/common';
const WHOLE_ENTRY = '*';

interface ImportSite {
  where: string;
  /** Imported names; `*` for a namespace or side-effect import of the whole entry. */
  names: string[];
}

export class IonicSingleBuildSystemLaw extends LawBase {
  static readonly LAW_NAME = 'Ionic Single Build System';

  static check(context: LawCheckContext): LawResult {
    const scan = AngularComponents.scan(context);
    const violations = [...scan.unread];
    const standalone: ImportSite[] = [];
    const modules: ImportSite[] = [];
    for (const source of scan.sources) {
      const where = (line: number): string => `${AngularComponents.relative(context, source.fileName)}:${line}`;
      for (const site of this.valueImports(source)) {
        if (site.module === STANDALONE_ENTRY) standalone.push({ where: where(site.line), names: site.names });
        if (site.module === MODULE_ENTRY) modules.push({ where: where(site.line), names: site.names });
      }
    }
    const notes: string[] = [];
    if (standalone.length > 0 && modules.length > 0) {
      const shared = this.sharedSymbols(context.projectRoot, scan.sources[0]?.ts ?? null);
      if (shared === null) {
        violations.push(
          `both entries are imported (${standalone.length} from '${STANDALONE_ENTRY}', ${modules.length} from '${MODULE_ENTRY}') and the installed @ionic/angular could not be read to tell the shared classes apart — NOT judged`
        );
      } else {
        violations.push(...this.mixed(standalone, modules, shared));
        notes.push(...this.sharedNotes(modules, shared));
      }
    }
    const result = this.createResult(
      violations,
      this.LAW_NAME,
      'FRAMEWORK',
      [
        `Pick one entry point; in a standalone app import every Ionic symbol from '${STANDALONE_ENTRY}'`,
        `Enforce it with a no-restricted-imports rule on '${MODULE_ENTRY}'`,
      ],
      context
    );
    return withNotes(result, notes);
  }

  /** Value imports and value re-exports in one file, with the names they bring. */
  static valueImports(source: TsxSource): Array<{ module: string; line: number; names: string[] }> {
    const ts = source.ts;
    const sites: Array<{ module: string; line: number; names: string[] }> = [];
    for (const statement of source.sourceFile.statements) {
      const read = ts.isImportDeclaration(statement)
        ? this.importNames(ts, statement)
        : ts.isExportDeclaration(statement)
          ? this.exportNames(ts, statement)
          : null;
      if (read && read.names.length > 0) {
        sites.push({ module: read.module, line: source.lineOf(statement), names: read.names });
      }
    }
    return sites;
  }

  private static importNames(
    ts: TypeScriptModule,
    statement: TS.ImportDeclaration
  ): { module: string; names: string[] } | null {
    if (!ts.isStringLiteral(statement.moduleSpecifier)) return null;
    const clause = statement.importClause;
    if (clause?.isTypeOnly) return null;
    const bindings = clause?.namedBindings;
    // A namespace, default or side-effect import loads the whole entry.
    const names =
      bindings && ts.isNamedImports(bindings)
        ? bindings.elements.filter(e => !e.isTypeOnly).map(e => (e.propertyName ?? e.name).text)
        : [WHOLE_ENTRY];
    return { module: statement.moduleSpecifier.text, names };
  }

  private static exportNames(
    ts: TypeScriptModule,
    statement: TS.ExportDeclaration
  ): { module: string; names: string[] } | null {
    const specifier = statement.moduleSpecifier;
    if (!specifier || !ts.isStringLiteral(specifier) || statement.isTypeOnly) return null;
    const clause = statement.exportClause;
    const names =
      clause && ts.isNamedExports(clause)
        ? clause.elements.filter(e => !e.isTypeOnly).map(e => (e.propertyName ?? e.name).text)
        : [WHOLE_ENTRY];
    return { module: specifier.text, names };
  }

  /**
   * The names the installed `@ionic/angular` entry re-exports from
   * `@ionic/angular/common` — the classes both builds share — or null when
   * the package or its entry cannot be read.
   */
  static sharedSymbols(projectRoot: string, ts: TypeScriptModule | null): Set<string> | null {
    if (!ts) return null;
    try {
      const manifestFile = this.installedManifest(projectRoot);
      if (!manifestFile) return null;
      const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8')) as {
        exports?: Record<string, { default?: string }>;
        module?: string;
      };
      const entry = manifest.exports?.['.']?.default ?? manifest.module;
      if (!entry) return null;
      const file = PathOperations.join(PathOperations.getDirectory(manifestFile), entry);
      const source = TsxSource.parse(ts, file, fs.readFileSync(file, 'utf8'));
      const shared = new Set<string>();
      for (const statement of source.sourceFile.statements) {
        if (!ts.isExportDeclaration(statement) || !statement.moduleSpecifier) continue;
        if (!ts.isStringLiteral(statement.moduleSpecifier) || statement.moduleSpecifier.text !== COMMON_ENTRY) continue;
        const clause = statement.exportClause;
        if (!clause || !ts.isNamedExports(clause)) continue;
        for (const element of clause.elements) shared.add(element.name.text);
      }
      return shared.size > 0 ? shared : null;
    } catch {
      return null;
    }
  }

  /**
   * node_modules/@ionic/angular/package.json, nearest to the project root —
   * found on disk, not through require.resolve, which refuses a package.json
   * that the package's exports map does not list.
   */
  private static installedManifest(projectRoot: string): string | null {
    let dir = PathOperations.resolve(projectRoot);
    for (;;) {
      const candidate = PathOperations.join(dir, 'node_modules', MODULE_ENTRY, 'package.json');
      if (fs.existsSync(candidate)) return candidate;
      const parent = PathOperations.getDirectory(dir);
      if (parent === dir) return null;
      dir = parent;
    }
  }

  private static mixed(standalone: ImportSite[], modules: ImportSite[], shared: Set<string>): string[] {
    const first = standalone[0]?.where ?? '';
    const others = standalone.length > 1 ? ` and ${standalone.length - 1} more` : '';
    return modules.flatMap(site => {
      const own = site.names.filter(name => !shared.has(name));
      if (own.length === 0) return [];
      const what = own.includes(WHOLE_ENTRY) ? `the whole '${MODULE_ENTRY}' entry` : own.join(', ');
      return [
        `${site.where}: imports ${what} from '${MODULE_ENTRY}' while ${first}${others} import from '${STANDALONE_ENTRY}' — a different class (a different DI token) in each build, and the module build's lazy loader; the docs say the two cannot be used at the same time`,
      ];
    });
  }

  private static sharedNotes(modules: ImportSite[], shared: Set<string>): string[] {
    return modules
      .filter(site => site.names.length > 0 && site.names.every(name => shared.has(name)))
      .map(
        site =>
          `${site.where}: ${site.names.join(', ')} from '${MODULE_ENTRY}' in a standalone app — the same class through ${COMMON_ENTRY}, harmless today; import it from '${STANDALONE_ENTRY}' so the next auto-import does not look normal`
      );
  }
}
