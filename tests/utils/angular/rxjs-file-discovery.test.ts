/**
 * @fileoverview Tests for rxjs-file-discovery.ts
 * @description RxJS File Discovery on real projects: the TypeScript files
 * are scanned from disk, the effects files are told by their name and their
 * content is read. No helper of the code under test is replaced.
 */

import path from 'path';

import { RxJSFileDiscovery } from '../../../src/utils/angular/rxjs-file-discovery';
import { FileUtils } from '../../../src/utils/file-utils';
import { project, removeProjects } from '../../checkers/toolkit-fixture';

afterAll(removeProjects);

const config = FileUtils.getMinimalDefaultConfig();

/** An effects class the way NgRx writes one. */
const EFFECTS = [
  "import { Injectable } from '@angular/core';",
  "import { Actions, createEffect, ofType } from '@ngrx/effects';",
  '@Injectable()',
  'export class AppEffects {',
  '  constructor(private actions$: Actions) {}',
  '  loadData$ = createEffect(() =>',
  "    this.actions$.pipe(ofType('[App] Load Data'))",
  '  );',
  '}',
  '',
].join('\n');

/** The effects files found, relative to the project, with forward slashes. */
const found = (files: Record<string, string>): string[] => {
  const root = project(files);
  return RxJSFileDiscovery.findNgRxFiles(root, config)
    .map(file => path.relative(root, file).replace(/\\/g, '/'))
    .sort();
};

describe('utils/angular/rxjs-file-discovery', () => {
  describe('RxJSFileDiscovery.findNgRxFiles', () => {
    it('finds nothing in a project without TypeScript files', () => {
      expect(found({ 'package.json': '{}' })).toEqual([]);
    });

    it('keeps only effects files, by name', () => {
      expect(
        found({
          'src/app/user.effects.ts': EFFECTS,
          'src/app/auth.effects.ts': EFFECTS,
          'src/app/user.service.ts': EFFECTS,
          'src/app/app.component.ts': EFFECTS,
        })
      ).toEqual(['src/app/auth.effects.ts', 'src/app/user.effects.ts']);
    });

    it('does not keep an effects file without NgRx content', () => {
      expect(
        found({
          'src/app/user.effects.ts': EFFECTS,
          'src/app/fake.effects.ts': 'export class FakeEffects {}\n',
        })
      ).toEqual(['src/app/user.effects.ts']);
    });

    it('does not keep an empty effects file', () => {
      expect(found({ 'src/app/empty.effects.ts': '' })).toEqual([]);
    });

    it('does not count a spec of an effects file', () => {
      expect(
        found({
          'src/app/app.effects.ts': EFFECTS,
          'src/app/app.effects.spec.ts': EFFECTS,
        })
      ).toEqual(['src/app/app.effects.ts']);
    });

    it('returns the absolute path of the file it found', () => {
      const root = project({ 'src/app/app.effects.ts': EFFECTS });
      const [file] = RxJSFileDiscovery.findNgRxFiles(root, config);

      expect(path.isAbsolute(file ?? '')).toBe(true);
      expect(FileUtils.exists(file ?? '')).toBe(true);
    });
  });
});
