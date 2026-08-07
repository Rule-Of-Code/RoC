/**
 * @fileoverview Tests for angular-signal-analyzer-base.ts
 * @description Tests for Angular Signal Analyzer Base class
 */

import type { RuleOfCodeConfig } from '../../../src/config/types';
import { AngularSignalAnalyzerBase } from '../../../src/utils/angular/angular-signal-base/angular-signal-analyzer-base';
import { CheckerUtils } from '../../../src/utils/checker-utils';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

// Concrete test implementation of abstract base class
class TestSignalAnalyzer extends AngularSignalAnalyzerBase {
  public analyzedFiles: string[] = [];
  public capturedViolations: string[][] = [];
  public capturedSuggestions: string[][] = [];

  protected getFileExtensions(): string[] {
    return ['.component.ts', '.service.ts'];
  }

  protected analyzeFile(
    filePath: string,
    projectRoot: string,
    violations: string[],
    suggestions: string[]
  ): void {
    this.analyzedFiles.push(filePath);
    this.capturedViolations.push([...violations]);
    this.capturedSuggestions.push([...suggestions]);
    // Simulate adding a violation
    violations.push(`Analyzed: ${filePath}`);
  }

  // Expose protected method for testing
  public runCommonCheck(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): { violations: string[]; suggestions: string[] } {
    return this.commonCheck(projectRoot, config);
  }
}

describe('utils/angular/angular-signal-base/angular-signal-analyzer-base', () => {
  const mockConfig = {
    projectRoot: '/test/project',
    verbose: false,
    excludePatterns: ['node_modules', 'dist'],
    includePatterns: ['**/*.ts'],
  } as unknown as RuleOfCodeConfig;

  describe('AngularSignalAnalyzerBase', () => {
    describe('getFileExtensions', () => {
      it('should be implemented by concrete subclass', () => {
        const analyzer = new TestSignalAnalyzer();
        const extensions = analyzer['getFileExtensions']();

        expect(extensions).toEqual(['.component.ts', '.service.ts']);
      });
    });

    describe('analyzeFile', () => {
      it('should be called for each discovered file', () => {
        const analyzer = new TestSignalAnalyzer();
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const joinSpy = jest.spyOn(PathOperations, 'join');

        existsSpy.mockReturnValue(true);
        joinSpy.mockImplementation((...parts) =>
          parts.filter(Boolean).join('/')
        );
        findFilesSpy.mockReturnValue([
          '/test/project/src/app.component.ts',
          '/test/project/src/user.service.ts',
        ]);

        const result = analyzer.runCommonCheck('/test/project', mockConfig);

        expect(analyzer.analyzedFiles).toHaveLength(2);
        expect(analyzer.analyzedFiles).toContain(
          '/test/project/src/app.component.ts'
        );
        expect(analyzer.analyzedFiles).toContain(
          '/test/project/src/user.service.ts'
        );
        expect(result.violations).toHaveLength(2);

        existsSpy.mockRestore();
        findFilesSpy.mockRestore();
        joinSpy.mockRestore();
      });

      it('should receive violations and suggestions arrays', () => {
        const analyzer = new TestSignalAnalyzer();
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const joinSpy = jest.spyOn(PathOperations, 'join');

        existsSpy.mockReturnValue(true);
        joinSpy.mockImplementation((...parts) =>
          parts.filter(Boolean).join('/')
        );
        findFilesSpy.mockReturnValue(['/test/project/src/app.component.ts']);

        analyzer.runCommonCheck('/test/project', mockConfig);

        expect(analyzer.capturedViolations).toHaveLength(1);
        expect(analyzer.capturedSuggestions).toHaveLength(1);

        existsSpy.mockRestore();
        findFilesSpy.mockRestore();
        joinSpy.mockRestore();
      });
    });

    describe('commonCheck', () => {
      it('should return empty results when src directory does not exist', () => {
        const analyzer = new TestSignalAnalyzer();
        const existsSpy = jest.spyOn(FileUtils, 'exists');

        existsSpy.mockReturnValue(false);

        const result = analyzer.runCommonCheck('/test/project', mockConfig);

        expect(result.violations).toHaveLength(0);
        expect(result.suggestions).toHaveLength(0);
        expect(analyzer.analyzedFiles).toHaveLength(0);

        existsSpy.mockRestore();
      });

      it('should return empty results when no files found', () => {
        const analyzer = new TestSignalAnalyzer();
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const joinSpy = jest.spyOn(PathOperations, 'join');

        existsSpy.mockReturnValue(true);
        joinSpy.mockImplementation((...parts) =>
          parts.filter(Boolean).join('/')
        );
        findFilesSpy.mockReturnValue([]);

        const result = analyzer.runCommonCheck('/test/project', mockConfig);

        expect(result.violations).toHaveLength(0);
        expect(result.suggestions).toHaveLength(0);
        expect(analyzer.analyzedFiles).toHaveLength(0);

        existsSpy.mockRestore();
        findFilesSpy.mockRestore();
        joinSpy.mockRestore();
      });

      it('should process all discovered files', () => {
        const analyzer = new TestSignalAnalyzer();
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const joinSpy = jest.spyOn(PathOperations, 'join');

        existsSpy.mockReturnValue(true);
        joinSpy.mockImplementation((...parts) =>
          parts.filter(Boolean).join('/')
        );
        findFilesSpy.mockReturnValue([
          '/test/project/src/file1.component.ts',
          '/test/project/src/file2.service.ts',
          '/test/project/src/file3.component.ts',
        ]);

        const result = analyzer.runCommonCheck('/test/project', mockConfig);

        expect(analyzer.analyzedFiles).toHaveLength(3);
        expect(result.violations).toHaveLength(3);

        existsSpy.mockRestore();
        findFilesSpy.mockRestore();
        joinSpy.mockRestore();
      });

      it('should use correct file extensions from getFileExtensions', () => {
        const analyzer = new TestSignalAnalyzer();
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const joinSpy = jest.spyOn(PathOperations, 'join');

        existsSpy.mockReturnValue(true);
        joinSpy.mockImplementation((...parts) =>
          parts.filter(Boolean).join('/')
        );
        findFilesSpy.mockReturnValue([]);

        analyzer.runCommonCheck('/test/project', mockConfig);

        expect(findFilesSpy).toHaveBeenCalledWith(
          expect.any(String),
          ['.component.ts', '.service.ts'],
          mockConfig
        );

        existsSpy.mockRestore();
        findFilesSpy.mockRestore();
        joinSpy.mockRestore();
      });

      it('should join project root with src directory', () => {
        const analyzer = new TestSignalAnalyzer();
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const joinSpy = jest.spyOn(PathOperations, 'join');

        existsSpy.mockReturnValue(true);
        joinSpy.mockImplementation((...parts) =>
          parts.filter(Boolean).join('/')
        );
        findFilesSpy.mockReturnValue([]);

        analyzer.runCommonCheck('/test/project', mockConfig);

        expect(joinSpy).toHaveBeenCalledWith('/test/project', 'src');

        existsSpy.mockRestore();
        findFilesSpy.mockRestore();
        joinSpy.mockRestore();
      });
    });
  });
});
