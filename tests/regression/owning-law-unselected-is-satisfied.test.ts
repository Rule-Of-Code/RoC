/**
 * #428: a checklist clause defers to the law that owns its concern. When the
 * audit would not select that owning law for the project — its `requires`
 * names a subject the project does not declare, or its `stack` excludes the
 * project type — the concern does not exist there, exactly as a written
 * `notApplicable` says. Running the owning law anyway asked it about an
 * absent subject; it inspected nothing, failed, and the checklist reported a
 * concern the audit had already ruled out.
 *
 * Where the owning law IS selected nothing changes: it runs, and its verdict
 * is the answer.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { owningLawSatisfied } from '../../src/utils/owning-law';
import { FileUtils } from '../../src/utils';
import type { LawCheckContext } from '../../src/types/law.types';

/** Gated by `requires: { anyDependency: ['@angular/core'] }`, stack frontend. */
const ANGULAR_LAW = 'OnPush Change Detection Strategy';

describe('owningLawSatisfied and a law the audit would not select', () => {
  let root: string;

  const write = (rel: string, content: string): void => {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  };

  const context = (type: 'angular' | 'node'): LawCheckContext => {
    const config = FileUtils.getMinimalDefaultConfig();
    return {
      projectRoot: root,
      config: { ...config, project: { ...config.project, type } },
    };
  };

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-owning-'));
  });
  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('is satisfied when the owning law requires a subject the project does not declare', async () => {
    write(
      'package.json',
      JSON.stringify({ name: 'cli', devDependencies: { typescript: '5.9.3' } })
    );
    write('src/index.ts', 'export const a = 1;\n');

    await expect(
      owningLawSatisfied(context('node'), ANGULAR_LAW)
    ).resolves.toBe(true);
  });

  it('runs the owning law, and takes its failure, when the subject is declared', async () => {
    write(
      'package.json',
      JSON.stringify({
        name: 'web',
        dependencies: { '@angular/core': '20.0.0' },
        devDependencies: { typescript: '5.9.3' },
      })
    );
    write('angular.json', '{}');
    write(
      'src/app/list.component.ts',
      [
        "import { Component } from '@angular/core';",
        '',
        "@Component({ selector: 'app-list', template: '<p>list</p>' })",
        'export class ListComponent {}',
        '',
      ].join('\n')
    );

    await expect(
      owningLawSatisfied(context('angular'), ANGULAR_LAW)
    ).resolves.toBe(false);
  });
});
