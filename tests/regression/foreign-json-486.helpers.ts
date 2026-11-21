/**
 * Shared by the #486 regression tests: a temp project per test and the
 * invalid package.json they read.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';

import { DEFAULT_CONFIG } from '../../src/config/types';
import type { LawCheckContext, LawResult } from '../../src/types/law.types';

export const INVALID = '{ "name": "x", "scripts": { ';
export const TYPE_ERROR = /TypeError|Cannot read propert|undefined \(reading/;

export const json = (value: unknown): string => JSON.stringify(value, null, 2);

export const texts = (result: LawResult): string[] => [
  ...((result.violations ?? []) as string[]),
  ...((result.suggestions ?? []) as string[]),
];

export interface TempProject {
  root: string;
  write(file: string, text: string): void;
  context(): LawCheckContext;
}

/** A fresh temp directory for each test of the calling file. */
export function useTempProject(): TempProject {
  const project: TempProject = {
    root: '',
    write(file, text) {
      const at = path.join(project.root, file);
      fs.mkdirSync(path.dirname(at), { recursive: true });
      fs.writeFileSync(at, text);
    },
    context: () => ({
      projectRoot: project.root,
      config: { ...DEFAULT_CONFIG },
    }),
  };
  beforeEach(() => {
    project.root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-486-'));
  });
  afterEach(() => {
    fs.rmSync(project.root, { recursive: true, force: true });
  });
  return project;
}
