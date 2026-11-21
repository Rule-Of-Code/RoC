/**
 * @fileoverview Tests for angular-signal-analyzer-base.ts
 * @description The Angular analyzer base, on real projects: commonCheck
 * finds the files with the subclass's extensions under src/ and hands each
 * to analyzeFile. A small concrete subclass records what it is given; no
 * helper of the code under test is replaced.
 */

import path from 'path';

import type { RuleOfCodeConfig } from '../../../src/config/types';
import { AngularSignalAnalyzerBase } from '../../../src/utils/angular/angular-signal-base/angular-signal-analyzer-base';
import { FileUtils } from '../../../src/utils/file-utils';
import { project, removeProjects } from '../../checkers/toolkit-fixture';

afterAll(removeProjects);

/** Records every file it is asked to analyze, and reports each once. */
class RecordingAnalyzer extends AngularSignalAnalyzerBase {
  readonly analyzed: string[] = [];

  protected getFileExtensions(): string[] {
    return ['.component.ts', '.service.ts'];
  }

  protected analyzeFile(
    filePath: string,
    _projectRoot: string,
    violations: string[],
    suggestions: string[]
  ): void {
    this.analyzed.push(filePath);
    violations.push(`analyzed ${path.basename(filePath)}`);
    suggestions.push(`seen ${violations.length}`);
  }

  run(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): { violations: string[]; suggestions: string[] } {
    return this.commonCheck(projectRoot, config);
  }
}

const config = FileUtils.getMinimalDefaultConfig();

/** Run the analyzer on a project made of `files`. */
const run = (files: Record<string, string>) => {
  const root = project(files);
  const analyzer = new RecordingAnalyzer();
  const result = analyzer.run(root, config);
  const analyzed = analyzer.analyzed
    .map(file => path.relative(root, file).replace(/\\/g, '/'))
    .sort();
  return { result, analyzed };
};

describe('utils/angular/angular-signal-base/angular-signal-analyzer-base', () => {
  describe('AngularSignalAnalyzerBase.commonCheck', () => {
    it('analyzes every file with one of the extensions, once', () => {
      const { result, analyzed } = run({
        'src/app/app.component.ts': 'export class A {}',
        'src/app/user.service.ts': 'export class U {}',
        'src/app/user.model.ts': 'export interface M {}',
      });

      expect(analyzed).toEqual([
        'src/app/app.component.ts',
        'src/app/user.service.ts',
      ]);
      expect(result.violations.sort()).toEqual([
        'analyzed app.component.ts',
        'analyzed user.service.ts',
      ]);
    });

    it('gives every file the same violations and suggestions arrays', () => {
      const { result } = run({
        'src/a.component.ts': 'export class A {}',
        'src/b.component.ts': 'export class B {}',
      });

      expect(result.suggestions.sort()).toEqual(['seen 1', 'seen 2']);
    });

    it('returns nothing, and analyzes nothing, without a src directory', () => {
      const { result, analyzed } = run({
        'lib/app.component.ts': 'export class A {}',
      });

      expect(analyzed).toEqual([]);
      expect(result).toEqual({ violations: [], suggestions: [] });
    });

    it('returns nothing when src holds no file with the extensions', () => {
      const { result, analyzed } = run({ 'src/main.ts': 'bootstrap();' });

      expect(analyzed).toEqual([]);
      expect(result).toEqual({ violations: [], suggestions: [] });
    });

    it('does not analyze a file under node_modules', () => {
      const { analyzed } = run({
        'src/app.component.ts': 'export class A {}',
        'src/node_modules/x/x.component.ts': 'export class X {}',
      });

      expect(analyzed).toEqual(['src/app.component.ts']);
    });
  });
});
