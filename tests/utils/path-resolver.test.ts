/**
 * PathResolver on real project fixtures: the canonical Angular entry files at
 * the root and in monorepo project folders, or wherever `pathMappings` points
 * (a literal path or a glob).
 */
import path from 'path';

import type { RuleOfCodeConfig } from '../../src/config/types';
import { PathResolver } from '../../src/utils/path-resolver';
import { project } from '../checkers/toolkit-fixture';

const norm = (paths: string[]): string[] =>
  paths.map(p => path.normalize(p)).sort();
const at = (root: string, ...rels: string[]): string[] =>
  norm(rels.map(rel => path.join(root, rel)));
const withMappings = (pathMappings: Record<string, unknown>) =>
  ({ pathMappings }) as unknown as RuleOfCodeConfig;

describe('PathResolver', () => {
  it('finds main.ts at the root and in apps/, libs/ and nested project folders', async () => {
    const root = project({
      'src/main.ts': '',
      'apps/admin/src/main.ts': '',
      'libs/shop/feature/src/main.ts': '',
      'packages/site/src/main.ts': '',
      'node_modules/pkg/apps/x/src/main.ts': '',
    });

    const found = await PathResolver.create(undefined, root).getMainTsPaths();

    expect(norm(found)).toEqual(
      at(
        root,
        'src/main.ts',
        'apps/admin/src/main.ts',
        'libs/shop/feature/src/main.ts',
        'packages/site/src/main.ts'
      )
    );
  });

  it('always names the root path, even when only a project folder has the file', async () => {
    const root = project({ 'projects/app/src/app/app.config.ts': '' });

    const found = await PathResolver.create(
      undefined,
      root
    ).getAppConfigPaths();

    expect(norm(found)).toEqual(
      at(root, 'src/app/app.config.ts', 'projects/app/src/app/app.config.ts')
    );
  });

  it('uses a literal pathMappings entry as given, without looking for it', async () => {
    const root = project({ 'README.md': '' });
    const config = withMappings({ appComponent: 'web/app/root.component.ts' });

    const found = await PathResolver.create(
      config,
      root
    ).getAppComponentPaths();

    expect(norm(found)).toEqual(at(root, 'web/app/root.component.ts'));
  });

  it('expands a glob pathMappings entry and keeps the literal ones of the same list', async () => {
    const root = project({
      'apps/a/src/app/app.module.ts': '',
      'apps/b/src/app/app.module.ts': '',
      'apps/b/dist/app.module.ts': '',
    });
    const config = withMappings({
      appModule: ['apps/*/src/app/app.module.ts', 'legacy/app.module.ts'],
    });

    const found = await PathResolver.create(config, root).getAppModulePaths();

    expect(norm(found)).toEqual(
      at(
        root,
        'apps/a/src/app/app.module.ts',
        'apps/b/src/app/app.module.ts',
        'legacy/app.module.ts'
      )
    );
  });

  it('falls back to detection for a key pathMappings does not name', async () => {
    const root = project({ 'src/main.ts': '' });
    const config = withMappings({ appModule: 'x/app.module.ts' });

    const found = await PathResolver.create(config, root).getMainTsPaths();

    expect(norm(found)).toEqual(at(root, 'src/main.ts'));
  });
});
