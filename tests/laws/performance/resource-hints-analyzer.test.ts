/**
 * Tests for ResourceHintsAnalyzerService
 *
 * Tests resource hints detection in index.html including preload, prefetch,
 * dns-prefetch, and preconnect.
 */
import { ResourceHintsAnalyzerService } from '../../../src/laws/performance/core-web-vitals-compliance/services/resource-hints.analyzer';
import { FileSystemOperations } from '../../../src/utils';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('ResourceHintsAnalyzerService', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('resource-hints-analyzer-test-');
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
    jest.restoreAllMocks();
  });

  describe('analyze', () => {
    it('should return hasHints false when index.html does not exist', () => {
      const result = ResourceHintsAnalyzerService.analyze(tempDir);

      expect(result.hasHints).toBe(false);
      expect(result.hints).toHaveLength(0);
    });

    it('should return hasHints false when index.html has no resource hints', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);
      const indexPath = PathOperations.join(srcDir, 'index.html');
      const content = `
<!DOCTYPE html>
<html>
<head>
  <title>Test App</title>
</head>
<body>
  <app-root></app-root>
</body>
</html>
`;
      FileSystemOperations.writeFile(indexPath, content);

      const result = ResourceHintsAnalyzerService.analyze(tempDir);

      expect(result.hasHints).toBe(false);
      expect(result.hints).toHaveLength(0);
    });

    it('should detect preload hints', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);
      const indexPath = PathOperations.join(srcDir, 'index.html');
      const content = `
<!DOCTYPE html>
<html>
<head>
  <link rel="preload" href="/assets/font.woff2" as="font" type="font/woff2" crossorigin>
</head>
<body></body>
</html>
`;
      FileSystemOperations.writeFile(indexPath, content);

      const result = ResourceHintsAnalyzerService.analyze(tempDir);

      expect(result.hasHints).toBe(true);
      expect(result.hints).toContain('Preload hints found');
    });

    it('should detect prefetch hints', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);
      const indexPath = PathOperations.join(srcDir, 'index.html');
      const content = `
<!DOCTYPE html>
<html>
<head>
  <link rel="prefetch" href="/lazy-module.js">
</head>
<body></body>
</html>
`;
      FileSystemOperations.writeFile(indexPath, content);

      const result = ResourceHintsAnalyzerService.analyze(tempDir);

      expect(result.hasHints).toBe(true);
      expect(result.hints).toContain('Prefetch hints found');
    });

    it('should detect dns-prefetch hints', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);
      const indexPath = PathOperations.join(srcDir, 'index.html');
      const content = `
<!DOCTYPE html>
<html>
<head>
  <link rel="dns-prefetch" href="//api.example.com">
</head>
<body></body>
</html>
`;
      FileSystemOperations.writeFile(indexPath, content);

      const result = ResourceHintsAnalyzerService.analyze(tempDir);

      expect(result.hasHints).toBe(true);
      expect(result.hints).toContain('DNS prefetch hints found');
    });

    it('should detect preconnect hints', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);
      const indexPath = PathOperations.join(srcDir, 'index.html');
      const content = `
<!DOCTYPE html>
<html>
<head>
  <link rel="preconnect" href="https://fonts.googleapis.com">
</head>
<body></body>
</html>
`;
      FileSystemOperations.writeFile(indexPath, content);

      const result = ResourceHintsAnalyzerService.analyze(tempDir);

      expect(result.hasHints).toBe(true);
      expect(result.hints).toContain('Preconnect hints found');
    });

    it('should detect multiple resource hints', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);
      const indexPath = PathOperations.join(srcDir, 'index.html');
      const content = `
<!DOCTYPE html>
<html>
<head>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="dns-prefetch" href="//api.example.com">
  <link rel="preload" href="/critical.css" as="style">
  <link rel="prefetch" href="/lazy-module.js">
</head>
<body></body>
</html>
`;
      FileSystemOperations.writeFile(indexPath, content);

      const result = ResourceHintsAnalyzerService.analyze(tempDir);

      expect(result.hasHints).toBe(true);
      expect(result.hints).toHaveLength(4);
      expect(result.hints).toContain('Preload hints found');
      expect(result.hints).toContain('Prefetch hints found');
      expect(result.hints).toContain('DNS prefetch hints found');
      expect(result.hints).toContain('Preconnect hints found');
    });

    it('should handle file read errors gracefully', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);
      const indexPath = PathOperations.join(srcDir, 'index.html');
      FileSystemOperations.writeFile(indexPath, '<html></html>');

      const readFileSpy = jest
        .spyOn(FileUtils, 'readFile')
        .mockImplementation(() => {
          throw new Error('Permission denied');
        });

      const result = ResourceHintsAnalyzerService.analyze(tempDir);

      expect(result.hasHints).toBe(false);
      expect(result.hints).toHaveLength(0);

      readFileSpy.mockRestore();
    });

    it('should detect preload with different attribute ordering', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);
      const indexPath = PathOperations.join(srcDir, 'index.html');
      const content = `
<head>
  <link href="/font.woff2" rel="preload" as="font">
</head>
`;
      FileSystemOperations.writeFile(indexPath, content);

      const result = ResourceHintsAnalyzerService.analyze(tempDir);

      expect(result.hasHints).toBe(true);
      expect(result.hints).toContain('Preload hints found');
    });

    it('should not detect hints with incorrect rel values', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);
      const indexPath = PathOperations.join(srcDir, 'index.html');
      const content = `
<head>
  <link rel="stylesheet" href="/styles.css">
  <link rel="icon" href="/favicon.ico">
</head>
`;
      FileSystemOperations.writeFile(indexPath, content);

      const result = ResourceHintsAnalyzerService.analyze(tempDir);

      expect(result.hasHints).toBe(false);
      expect(result.hints).toHaveLength(0);
    });

    it('should handle empty index.html', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);
      const indexPath = PathOperations.join(srcDir, 'index.html');
      FileSystemOperations.writeFile(indexPath, '');

      const result = ResourceHintsAnalyzerService.analyze(tempDir);

      expect(result.hasHints).toBe(false);
      expect(result.hints).toHaveLength(0);
    });

    it('should detect hints in minified HTML', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);
      const indexPath = PathOperations.join(srcDir, 'index.html');
      const content =
        '<!DOCTYPE html><html><head><link rel="preload" href="/app.js" as="script"><link rel="preconnect" href="https://api.com"></head><body></body></html>';
      FileSystemOperations.writeFile(indexPath, content);

      const result = ResourceHintsAnalyzerService.analyze(tempDir);

      expect(result.hasHints).toBe(true);
      expect(result.hints).toContain('Preload hints found');
      expect(result.hints).toContain('Preconnect hints found');
    });
  });
});
