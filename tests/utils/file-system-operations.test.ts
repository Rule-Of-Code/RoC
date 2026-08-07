/**
 * File System Operations - Tests
 * Tests for FileSystemOperations class using real temp directories
 */

import { FileSystemOperations } from '../../src/utils/file-system-operations';
import { FileUtils } from '../../src/utils/file-utils';
import { PathOperations } from '../../src/utils/path-operations';

describe('FileSystemOperations', () => {
  let tempDir: string;

  beforeEach(() => {
    // Create a unique temp directory for each test
    tempDir = FileUtils.createTempDirectory('roc-test-');
  });

  afterEach(() => {
    // Clean up temp directory
    if (FileUtils.exists(tempDir)) {
      FileUtils.deleteDirectory(tempDir);
    }
  });

  // ============================================
  // Existence Checks
  // ============================================
  describe('exists()', () => {
    it('should return true for existing file', () => {
      const filePath = PathOperations.join(tempDir, 'test.txt');
      FileUtils.writeFileSync(filePath, 'test content');
      expect(FileSystemOperations.exists(filePath)).toBe(true);
    });

    it('should return true for existing directory', () => {
      const dirPath = PathOperations.join(tempDir, 'subdir');
      FileUtils.createDirectory(dirPath);
      expect(FileSystemOperations.exists(dirPath)).toBe(true);
    });

    it('should return false for non-existing path', () => {
      const fakePath = PathOperations.join(tempDir, 'nonexistent.txt');
      expect(FileSystemOperations.exists(fakePath)).toBe(false);
    });
  });

  describe('fileExists()', () => {
    it('should be an alias for exists()', () => {
      const filePath = PathOperations.join(tempDir, 'test.txt');
      FileUtils.writeFileSync(filePath, 'test content');
      expect(FileSystemOperations.fileExists(filePath)).toBe(true);
    });
  });

  describe('isFile()', () => {
    it('should return true for file', () => {
      const filePath = PathOperations.join(tempDir, 'test.txt');
      FileUtils.writeFileSync(filePath, 'test content');
      expect(FileSystemOperations.isFile(filePath)).toBe(true);
    });

    it('should return false for directory', () => {
      const dirPath = PathOperations.join(tempDir, 'subdir');
      FileUtils.createDirectory(dirPath);
      expect(FileSystemOperations.isFile(dirPath)).toBe(false);
    });

    it('should return false for non-existing path', () => {
      const fakePath = PathOperations.join(tempDir, 'nonexistent.txt');
      expect(FileSystemOperations.isFile(fakePath)).toBe(false);
    });
  });

  describe('isDirectory()', () => {
    it('should return true for directory', () => {
      const dirPath = PathOperations.join(tempDir, 'subdir');
      FileUtils.createDirectory(dirPath);
      expect(FileSystemOperations.isDirectory(dirPath)).toBe(true);
    });

    it('should return false for file', () => {
      const filePath = PathOperations.join(tempDir, 'test.txt');
      FileUtils.writeFileSync(filePath, 'test content');
      expect(FileSystemOperations.isDirectory(filePath)).toBe(false);
    });

    it('should return false for non-existing path', () => {
      const fakePath = PathOperations.join(tempDir, 'nonexistent');
      expect(FileSystemOperations.isDirectory(fakePath)).toBe(false);
    });
  });

  describe('getPathInfo()', () => {
    it('should return file info for existing file', () => {
      const filePath = PathOperations.join(tempDir, 'test.txt');
      FileUtils.writeFileSync(filePath, 'test content');
      const info = FileSystemOperations.getPathInfo(filePath);
      expect(info.exists).toBe(true);
      expect(info.isFile).toBe(true);
      expect(info.isDirectory).toBe(false);
      expect(info.extension).toBe('.txt');
    });

    it('should return directory info for existing directory', () => {
      const dirPath = PathOperations.join(tempDir, 'subdir');
      FileUtils.createDirectory(dirPath);
      const info = FileSystemOperations.getPathInfo(dirPath);
      expect(info.exists).toBe(true);
      expect(info.isFile).toBe(false);
      expect(info.isDirectory).toBe(true);
    });

    it('should return non-existing info for non-existing path', () => {
      const fakePath = PathOperations.join(tempDir, 'nonexistent.txt');
      const info = FileSystemOperations.getPathInfo(fakePath);
      expect(info.exists).toBe(false);
      expect(info.isFile).toBe(false);
      expect(info.isDirectory).toBe(false);
    });

    it('should include size and modified date', () => {
      const filePath = PathOperations.join(tempDir, 'test.txt');
      FileUtils.writeFileSync(filePath, 'test content');
      const info = FileSystemOperations.getPathInfo(filePath);
      expect(info.size).toBe(12); // "test content" = 12 bytes
      expect(info.modified).toBeDefined();
      expect(info.modified?.getTime()).toBeGreaterThan(0);
    });
  });

  describe('getFileStats()', () => {
    it('should return stats for existing file', () => {
      const filePath = PathOperations.join(tempDir, 'test.txt');
      FileUtils.writeFileSync(filePath, 'test content');
      const stats = FileSystemOperations.getFileStats(filePath);
      expect(stats).not.toBeNull();
      expect(stats?.isFile()).toBe(true);
    });

    it('should return null for non-existing file', () => {
      const fakePath = PathOperations.join(tempDir, 'nonexistent.txt');
      const stats = FileSystemOperations.getFileStats(fakePath);
      expect(stats).toBeNull();
    });
  });

  // ============================================
  // File Reading
  // ============================================
  describe('readFile()', () => {
    it('should read file content', () => {
      const filePath = PathOperations.join(tempDir, 'test.txt');
      FileUtils.writeFileSync(filePath, 'test content');
      const content = FileSystemOperations.readFile(filePath);
      expect(content).toBe('test content');
    });

    it('should return empty string for non-existing file with fallback', () => {
      const fakePath = PathOperations.join(tempDir, 'nonexistent.txt');
      const content = FileSystemOperations.readFile(fakePath, {
        fallbackToEmpty: true,
      });
      expect(content).toBe('');
    });

    it('should throw for non-existing file without fallback', () => {
      const fakePath = PathOperations.join(tempDir, 'nonexistent.txt');
      expect(() => {
        FileSystemOperations.readFile(fakePath, { fallbackToEmpty: false });
      }).toThrow();
    });
  });

  describe('readFileSync()', () => {
    it('should be a legacy alias for readFile', () => {
      const filePath = PathOperations.join(tempDir, 'test.txt');
      FileUtils.writeFileSync(filePath, 'test content');
      const content = FileSystemOperations.readFileSync(filePath);
      expect(content).toBe('test content');
    });
  });

  describe('readJsonFile()', () => {
    it('should read and parse JSON file', () => {
      const filePath = PathOperations.join(tempDir, 'test.json');
      FileUtils.writeFileSync(filePath, JSON.stringify({ key: 'value' }));
      const data = FileSystemOperations.readJsonFile<{ key: string }>(filePath);
      expect(data.key).toBe('value');
    });

    it('should return fallback value for non-existing file', () => {
      const fakePath = PathOperations.join(tempDir, 'nonexistent.json');
      const data = FileSystemOperations.readJsonFile(fakePath, {
        default: true,
      });
      expect(data).toEqual({ default: true });
    });

    it('should throw for non-existing file without fallback', () => {
      const fakePath = PathOperations.join(tempDir, 'nonexistent.json');
      expect(() => {
        FileSystemOperations.readJsonFile(fakePath);
      }).toThrow();
    });

    it('should parse a JSON file with a UTF-8 BOM (Windows editors)', () => {
      const filePath = PathOperations.join(tempDir, 'bom.json');
      FileUtils.writeFileSync(
        filePath,
        '\uFEFF' + JSON.stringify({ key: 'value' })
      );
      const data = FileSystemOperations.readJsonFile<{ key: string }>(filePath);
      expect(data.key).toBe('value');
    });
  });

  describe('readFileLines()', () => {
    it('should read file as array of lines', () => {
      const filePath = PathOperations.join(tempDir, 'test.txt');
      FileUtils.writeFileSync(filePath, 'line1\nline2\nline3');
      const lines = FileSystemOperations.readFileLines(filePath);
      expect(lines).toEqual(['line1', 'line2', 'line3']);
    });

    it('should handle Windows line endings', () => {
      const filePath = PathOperations.join(tempDir, 'test.txt');
      FileUtils.writeFileSync(filePath, 'line1\r\nline2\r\nline3');
      const lines = FileSystemOperations.readFileLines(filePath);
      expect(lines).toEqual(['line1', 'line2', 'line3']);
    });
  });

  // ============================================
  // File Writing
  // ============================================
  describe('writeFile()', () => {
    it('should write content to file', () => {
      const filePath = PathOperations.join(tempDir, 'test.txt');
      FileSystemOperations.writeFile(filePath, 'new content');
      expect(FileUtils.readFileSync(filePath, 'utf8')).toBe('new content');
    });

    it('should create parent directories', () => {
      const filePath = PathOperations.join(
        tempDir,
        'subdir',
        'deep',
        'test.txt'
      );
      FileSystemOperations.writeFile(filePath, 'nested content');
      expect(FileUtils.exists(filePath)).toBe(true);
      expect(FileUtils.readFileSync(filePath, 'utf8')).toBe('nested content');
    });
  });

  describe('writeFileSync()', () => {
    it('should be a legacy alias for writeFile', () => {
      const filePath = PathOperations.join(tempDir, 'test.txt');
      FileSystemOperations.writeFileSync(filePath, 'sync content');
      expect(FileUtils.readFileSync(filePath, 'utf8')).toBe('sync content');
    });
  });

  describe('writeJsonFile()', () => {
    it('should write JSON object to file', () => {
      const filePath = PathOperations.join(tempDir, 'test.json');
      FileSystemOperations.writeJsonFile(filePath, { key: 'value' });
      const content = JSON.parse(FileUtils.readFileSync(filePath, 'utf8'));
      expect(content.key).toBe('value');
    });

    it('should format JSON with 2 spaces', () => {
      const filePath = PathOperations.join(tempDir, 'test.json');
      FileSystemOperations.writeJsonFile(filePath, { key: 'value' });
      const content = FileUtils.readFileSync(filePath, 'utf8');
      expect(content).toContain('  "key"');
    });
  });

  describe('appendToFile()', () => {
    it('should append content to existing file', () => {
      const filePath = PathOperations.join(tempDir, 'test.txt');
      FileUtils.writeFileSync(filePath, 'initial');
      FileSystemOperations.appendToFile(filePath, ' appended');
      expect(FileUtils.readFileSync(filePath, 'utf8')).toBe('initial appended');
    });

    it('should create file if not exists', () => {
      const filePath = PathOperations.join(tempDir, 'new.txt');
      FileSystemOperations.appendToFile(filePath, 'first content');
      expect(FileUtils.readFileSync(filePath, 'utf8')).toBe('first content');
    });
  });

  // ============================================
  // Directory Operations
  // ============================================
  describe('createDirectory()', () => {
    it('should create directory', () => {
      const dirPath = PathOperations.join(tempDir, 'newdir');
      FileSystemOperations.createDirectory(dirPath);
      expect(FileUtils.exists(dirPath)).toBe(true);
      expect(FileSystemOperations.isDirectory(dirPath)).toBe(true);
    });

    it('should create nested directories', () => {
      const dirPath = PathOperations.join(tempDir, 'a', 'b', 'c');
      FileSystemOperations.createDirectory(dirPath);
      expect(FileUtils.exists(dirPath)).toBe(true);
    });

    it('should not fail if directory exists', () => {
      const dirPath = PathOperations.join(tempDir, 'existing');
      FileUtils.createDirectory(dirPath);
      expect(() => {
        FileSystemOperations.createDirectory(dirPath);
      }).not.toThrow();
    });
  });

  describe('createParentDirectories()', () => {
    it('should create parent directories for file path', () => {
      const filePath = PathOperations.join(tempDir, 'a', 'b', 'file.txt');
      FileSystemOperations.createParentDirectories(filePath);
      expect(FileUtils.exists(PathOperations.join(tempDir, 'a', 'b'))).toBe(
        true
      );
    });
  });

  // ============================================
  // File Operations
  // ============================================
  describe('copyFile()', () => {
    it('should copy file to destination', () => {
      const source = PathOperations.join(tempDir, 'source.txt');
      const dest = PathOperations.join(tempDir, 'dest.txt');
      FileUtils.writeFileSync(source, 'copy content');
      FileSystemOperations.copyFile(source, dest);
      expect(FileUtils.readFileSync(dest, 'utf8')).toBe('copy content');
    });

    it('should create parent directories for destination', () => {
      const source = PathOperations.join(tempDir, 'source.txt');
      const dest = PathOperations.join(tempDir, 'subdir', 'dest.txt');
      FileUtils.writeFileSync(source, 'copy content');
      FileSystemOperations.copyFile(source, dest);
      expect(FileUtils.exists(dest)).toBe(true);
    });
  });

  describe('moveFile()', () => {
    it('should move file to destination', () => {
      const source = PathOperations.join(tempDir, 'source.txt');
      const dest = PathOperations.join(tempDir, 'dest.txt');
      FileUtils.writeFileSync(source, 'move content');
      FileSystemOperations.moveFile(source, dest);
      expect(FileUtils.exists(source)).toBe(false);
      expect(FileUtils.readFileSync(dest, 'utf8')).toBe('move content');
    });
  });

  describe('deleteFile()', () => {
    it('should delete existing file', () => {
      const filePath = PathOperations.join(tempDir, 'test.txt');
      FileUtils.writeFileSync(filePath, 'content');
      FileSystemOperations.deleteFile(filePath);
      expect(FileUtils.exists(filePath)).toBe(false);
    });

    it('should not throw for non-existing file', () => {
      const fakePath = PathOperations.join(tempDir, 'nonexistent.txt');
      expect(() => {
        FileSystemOperations.deleteFile(fakePath);
      }).not.toThrow();
    });
  });

  describe('deleteDirectory()', () => {
    it('should delete directory recursively', () => {
      const dirPath = PathOperations.join(tempDir, 'toDelete');
      FileUtils.createDirectory(dirPath);
      FileUtils.writeFileSync(
        PathOperations.join(dirPath, 'file.txt'),
        'content'
      );
      FileSystemOperations.deleteDirectory(dirPath);
      expect(FileUtils.exists(dirPath)).toBe(false);
    });
  });
});
