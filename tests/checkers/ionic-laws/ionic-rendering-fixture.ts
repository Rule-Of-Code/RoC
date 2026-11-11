/**
 * Fixtures for the Ionic rendering laws: an Ionic Angular project and a
 * one-line way to write a standalone component with its template and styles.
 */
import type { LawCheckContext, LawResult } from '../../../src/types';
import { ctx, manifest, project } from '../toolkit-fixture';

export const IONIC_ANGULAR = manifest({
  '@angular/core': '20.0.0',
  '@ionic/angular': '8.8.17',
});

export interface ComponentSpec {
  selector: string;
  /** Written to `<file>.html` and referenced by templateUrl, unless `inline`. */
  template: string;
  inline?: boolean;
  /** Written to `<file>.css` and referenced by styleUrl. */
  css?: string;
  /** Class body. */
  body?: string;
  /** Extra decorator properties, e.g. `host: { '(pointerdown)': 'down()' }`. */
  meta?: string;
  /** Lines before the class (imports). */
  head?: string;
}

/** `{ 'src/app/x.page.ts': …, 'src/app/x.page.html': … }` for one component. */
export function component(path: string, className: string, spec: ComponentSpec): Record<string, string> {
  const base = path.replace(/\.ts$/, '');
  const name = base.split('/').pop() ?? base;
  const files: Record<string, string> = {};
  const meta = [`  selector: '${spec.selector}',`];
  if (spec.inline) meta.push(`  template: \`${spec.template}\`,`);
  else {
    meta.push(`  templateUrl: './${name}.html',`);
    files[`${base}.html`] = spec.template;
  }
  if (spec.css !== undefined) {
    meta.push(`  styleUrl: './${name}.css',`);
    files[`${base}.css`] = spec.css;
  }
  if (spec.meta) meta.push(`  ${spec.meta},`);
  files[path] = [
    "import { Component } from '@angular/core';",
    spec.head ?? '',
    '@Component({',
    ...meta,
    '})',
    `export class ${className} {`,
    spec.body ?? '',
    '}',
  ].join('\n');
  return files;
}

export function runner(
  check: (context: LawCheckContext) => LawResult,
  base: Record<string, string> = { 'package.json': IONIC_ANGULAR }
): (files: Record<string, string>, overrides?: Record<string, unknown>) => LawResult {
  return (files, overrides = {}) => check(ctx(project({ ...base, ...files }), overrides));
}
