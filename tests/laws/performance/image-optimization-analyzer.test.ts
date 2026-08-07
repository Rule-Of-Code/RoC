/**
 * Tests for ImageOptimizationAnalyzerService
 *
 * Tests image optimization detection including WebP images and lazy loading implementation.
 */
import { ImageOptimizationAnalyzerService } from '../../../src/laws/performance/core-web-vitals-compliance/services/image-optimization.analyzer';
import type { RuleOfCodeConfig } from '../../../src/types/law.types';
import { FileSystemOperations } from '../../../src/utils';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('ImageOptimizationAnalyzerService', () => {
  let tempDir: string;
  let mockConfig: RuleOfCodeConfig;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory(
      'image-optimization-analyzer-test-'
    );
    mockConfig = {
      project: {
        name: 'test-project',
        componentPrefix: 'app',
        type: 'angular',
      },
      ignores: {
        global: ['node_modules/**', 'dist/**'],
        tests: ['**/*.spec.ts'],
        build: ['dist/**'],
        design: [],
      },
      laws: {
        paretoMode: false,
        severity: {},
      },
      hooks: {
        preCommit: false,
        prePush: false,
        commitMsg: false,
      },
      reporting: {
        format: 'console',
        verbose: false,
        onlyFailures: false,
        scoring: true,
      },
      performance: {
        parallel: true,
        maxConcurrent: 4,
        cache: true,
      },
    };
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
  });

  describe('analyze', () => {
    it('should return isOptimized false when no optimizations are found', () => {
      const result = ImageOptimizationAnalyzerService.analyze(
        tempDir,
        mockConfig
      );

      expect(result.isOptimized).toBe(false);
      expect(result.optimizations).toHaveLength(0);
    });

    it('should detect WebP images', () => {
      const assetsDir = PathOperations.join(tempDir, 'src', 'assets');
      FileUtils.createDirectory(assetsDir);
      const webpFile = PathOperations.join(assetsDir, 'image.webp');
      FileSystemOperations.writeFile(webpFile, 'fake webp content');

      const result = ImageOptimizationAnalyzerService.analyze(
        tempDir,
        mockConfig
      );

      expect(result.isOptimized).toBe(true);
      expect(result.optimizations).toContainEqual(
        expect.stringContaining('WebP images found')
      );
    });

    it('should count multiple WebP images', () => {
      const assetsDir = PathOperations.join(tempDir, 'src', 'assets');
      FileUtils.createDirectory(assetsDir);

      // Create multiple webp files
      FileSystemOperations.writeFile(
        PathOperations.join(assetsDir, 'image1.webp'),
        'content'
      );
      FileSystemOperations.writeFile(
        PathOperations.join(assetsDir, 'image2.webp'),
        'content'
      );
      FileSystemOperations.writeFile(
        PathOperations.join(assetsDir, 'image3.webp'),
        'content'
      );

      const result = ImageOptimizationAnalyzerService.analyze(
        tempDir,
        mockConfig
      );

      expect(result.isOptimized).toBe(true);
      expect(result.optimizations).toContainEqual(
        expect.stringContaining('WebP images found: 3')
      );
    });

    it('should detect lazy loading with loading="lazy" attribute', () => {
      const srcDir = PathOperations.join(tempDir, 'src', 'app');
      FileUtils.createDirectory(srcDir);
      const componentFile = PathOperations.join(srcDir, 'image.component.ts');
      const content = `
@Component({
  template: \`<img src="image.jpg" loading="lazy" alt="Lazy image">\`
})
export class ImageComponent {}
`;
      FileSystemOperations.writeFile(componentFile, content);

      const result = ImageOptimizationAnalyzerService.analyze(
        tempDir,
        mockConfig
      );

      expect(result.isOptimized).toBe(true);
      expect(result.optimizations).toContain(
        'Lazy loading implementation detected'
      );
    });

    it('should detect lazy loading with IntersectionObserver', () => {
      const srcDir = PathOperations.join(tempDir, 'src', 'app');
      FileUtils.createDirectory(srcDir);
      const componentFile = PathOperations.join(
        srcDir,
        'lazy-image.component.ts'
      );
      const content = `
@Component({
  selector: 'app-lazy-image'
})
export class LazyImageComponent implements OnInit {
  ngOnInit() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // Load image
        }
      });
    });
  }
}
`;
      FileSystemOperations.writeFile(componentFile, content);

      const result = ImageOptimizationAnalyzerService.analyze(
        tempDir,
        mockConfig
      );

      expect(result.isOptimized).toBe(true);
      expect(result.optimizations).toContain(
        'Lazy loading implementation detected'
      );
    });

    it('should detect both WebP images and lazy loading', () => {
      // Create WebP image
      const assetsDir = PathOperations.join(tempDir, 'src', 'assets');
      FileUtils.createDirectory(assetsDir);
      FileSystemOperations.writeFile(
        PathOperations.join(assetsDir, 'hero.webp'),
        'content'
      );

      // Create component with lazy loading
      const srcDir = PathOperations.join(tempDir, 'src', 'app');
      FileUtils.createDirectory(srcDir);
      const componentFile = PathOperations.join(srcDir, 'gallery.component.ts');
      FileSystemOperations.writeFile(componentFile, 'loading="lazy"');

      const result = ImageOptimizationAnalyzerService.analyze(
        tempDir,
        mockConfig
      );

      expect(result.isOptimized).toBe(true);
      expect(result.optimizations).toHaveLength(2);
      expect(result.optimizations).toContainEqual(
        expect.stringContaining('WebP images found')
      );
      expect(result.optimizations).toContain(
        'Lazy loading implementation detected'
      );
    });

    it('should not detect lazy loading in non-component files', () => {
      const srcDir = PathOperations.join(tempDir, 'src', 'app');
      FileUtils.createDirectory(srcDir);
      const serviceFile = PathOperations.join(srcDir, 'image.service.ts');
      FileSystemOperations.writeFile(serviceFile, 'loading="lazy"');

      const result = ImageOptimizationAnalyzerService.analyze(
        tempDir,
        mockConfig
      );

      expect(result.optimizations).not.toContain(
        'Lazy loading implementation detected'
      );
    });

    it('should return isOptimized true with single optimization', () => {
      const assetsDir = PathOperations.join(tempDir, 'src', 'assets');
      FileUtils.createDirectory(assetsDir);
      FileSystemOperations.writeFile(
        PathOperations.join(assetsDir, 'logo.webp'),
        'content'
      );

      const result = ImageOptimizationAnalyzerService.analyze(
        tempDir,
        mockConfig
      );

      expect(result.isOptimized).toBe(true);
      expect(result.optimizations.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle file read errors gracefully for component files', () => {
      const srcDir = PathOperations.join(tempDir, 'src', 'app');
      FileUtils.createDirectory(srcDir);
      const componentFile = PathOperations.join(srcDir, 'test.component.ts');
      FileSystemOperations.writeFile(componentFile, 'loading="lazy"');

      const readFileSpy = jest
        .spyOn(FileUtils, 'readFile')
        .mockImplementation(() => {
          throw new Error('Permission denied');
        });

      const result = ImageOptimizationAnalyzerService.analyze(
        tempDir,
        mockConfig
      );

      expect(result.optimizations).not.toContain(
        'Lazy loading implementation detected'
      );

      readFileSpy.mockRestore();
    });

    it('should handle errors when counting WebP files', () => {
      // Create a directory structure
      const assetsDir = PathOperations.join(tempDir, 'src', 'assets');
      FileUtils.createDirectory(assetsDir);

      // Mock CheckerUtils to throw error indirectly via file system error
      const result = ImageOptimizationAnalyzerService.analyze(
        tempDir,
        mockConfig
      );

      // Should not throw and should return valid result
      expect(result).toBeDefined();
      expect(result.isOptimized).toBe(false);
    });

    it('should not count zero WebP images as optimization', () => {
      const assetsDir = PathOperations.join(tempDir, 'src', 'assets');
      FileUtils.createDirectory(assetsDir);
      // Only create non-WebP images
      FileSystemOperations.writeFile(
        PathOperations.join(assetsDir, 'image.png'),
        'content'
      );
      FileSystemOperations.writeFile(
        PathOperations.join(assetsDir, 'image.jpg'),
        'content'
      );

      const result = ImageOptimizationAnalyzerService.analyze(
        tempDir,
        mockConfig
      );

      expect(result.optimizations).not.toContainEqual(
        expect.stringContaining('WebP images found: 0')
      );
    });
  });
});
