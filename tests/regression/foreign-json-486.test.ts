/**
 * #486 — package.json, tsconfig.json and ESLint .json configs were read with
 * RoC's own config loader, which returns null for any JSON without
 * ignores/includes/laws. Laws then passed silently, reported a file they never
 * read as missing, or put a TypeError text in the findings. Each case here was
 * red on 8b5a6ff.
 */

import path from 'path';

import { TypeScriptChecker } from '../../src/checkers/typescript-checker';
import type { RawConstitutionalLaw } from '../../src/types/law.types';
import { readJsonManifest } from '../../src/utils/json-manifest';
import { INVALID, json, useTempProject } from './foreign-json-486.helpers';

const project = useTempProject();
const { write } = project;
const context = () => project.context();

describe('readJsonManifest', () => {
  it('reads a package.json that has no RoC keys', () => {
    write('package.json', json({ name: 'x', scripts: { audit: 'npm audit' } }));
    expect(readJsonManifest(path.join(project.root, 'package.json'))).toEqual({
      data: { name: 'x', scripts: { audit: 'npm audit' } },
    });
  });

  it('reads JSONC only when asked', () => {
    write('tsconfig.json', '{ // c\n "compilerOptions": {}, }');
    const file = path.join(project.root, 'tsconfig.json');
    expect(readJsonManifest(file).notRead).toMatch(/^is not valid JSON/);
    expect(readJsonManifest(file, { jsonc: true }).data).toEqual({
      compilerOptions: {},
    });
  });

  it('says why: invalid JSON, not an object, unreadable', () => {
    write('a.json', INVALID);
    write('b.json', '[1]');
    expect(readJsonManifest(path.join(project.root, 'a.json')).notRead).toMatch(
      /^is not valid JSON \(/
    );
    expect(readJsonManifest(path.join(project.root, 'b.json')).notRead).toBe(
      'is not a JSON object'
    );
    expect(readJsonManifest(path.join(project.root, 'none.json')).notRead).toBe(
      'could not be read (ENOENT)'
    );
  });

  it('ignores a UTF-8 BOM', () => {
    write('package.json', '﻿{"name":"x"}');
    expect(
      readJsonManifest(path.join(project.root, 'package.json')).data
    ).toEqual({
      name: 'x',
    });
  });
});

describe('TypeScriptChecker (tsconfig)', () => {
  const law = {
    id: 'law-3',
    title: 'TypeScript Strict Mode',
    description: 'Ensures TypeScript strict mode is enabled',
  } as RawConstitutionalLaw;

  it('says NOT read for an invalid tsconfig', async () => {
    write('tsconfig.json', '{ "compilerOptions": ');
    const result = await new TypeScriptChecker(law, 3).check(context());
    expect(result.passed).toBe(false);
    expect(result.message).toMatch(
      /^tsconfig\.json is not valid JSON .* — its compiler options were NOT read$/
    );
  });

  it('reads strict mode from the file (it never saw it before)', async () => {
    write('tsconfig.json', json({ compilerOptions: { strict: true } }));
    const checker = new TypeScriptChecker(law, 3);
    const run = jest
      .spyOn(
        checker as unknown as {
          executeCommand: () => { success: boolean; stderr: string };
        },
        'executeCommand'
      )
      .mockReturnValue({ success: true, stderr: '' });
    const result = await checker.check(context());
    expect(run).toHaveBeenCalled();
    expect(result.message).not.toBe('TypeScript strict mode is not enabled');
  });
});
