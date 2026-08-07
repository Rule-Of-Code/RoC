import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { SASTAnalyzerService } from '../../src/laws/security/security-testing-requirements/services/sast-analyzer.service';
import { ProjectLicenseAnalyzerValidation } from '../../src/utils/licensing/project-license-analyzer/project-license-analyzer-validation';

/**
 * Regression: the two findings a backend consumer reported against v7.9.1.
 *
 * Both laws made a claim about OUR vocabulary and reported it as a fact about
 * THEIR project. These tests pin the contract, not the implementation — the
 * mode-collapse P0 shipped because its test asserted the defect.
 */
describe('a backend consumer regressions (v7.9.1)', () => {
  let root: string;

  const write = (rel: string, content: string): void => {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  };

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-be-'));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  describe('License consistency knows more than five OSS licences', () => {
    const proprietary =
      'Copyright (c) 2026 ACME Ltd.\nAll rights reserved. Proprietary and confidential.\n';

    it('does not invent a mismatch for a private UNLICENSED package that HAS a LICENSE file', () => {
      // The only way to "pass" used to be deleting the LICENSE file: the law
      // rewarded destroying a real legal artifact. It must not.
      write('LICENSE', proprietary);

      const result = ProjectLicenseAnalyzerValidation.validateProjectLicense(
        root,
        { private: true, license: 'UNLICENSED' } as never
      );

      expect(result.violations).toEqual([]);
    });

    it('accepts SPDX "SEE LICENSE IN" against proprietary content', () => {
      write('LICENSE', proprietary);

      const result = ProjectLicenseAnalyzerValidation.validateProjectLicense(
        root,
        { private: true, license: 'SEE LICENSE IN LICENSE' } as never
      );

      expect(result.violations).toEqual([]);
    });

    it('still reports a mismatch it can actually establish (MIT declared, Apache on disk)', () => {
      write('LICENSE', 'Apache License\nVersion 2.0, January 2004\n');

      const result = ProjectLicenseAnalyzerValidation.validateProjectLicense(
        root,
        { license: 'MIT' } as never
      );

      expect(result.violations.some(v => /mismatch/i.test(v))).toBe(true);
    });

    it('stays silent when the declared licence matches the file', () => {
      write('LICENSE', 'MIT License\n\nPermission is hereby granted...\n');

      const result = ProjectLicenseAnalyzerValidation.validateProjectLicense(
        root,
        { license: 'MIT' } as never
      );

      expect(result.violations).toEqual([]);
    });

    it('still flags a PUBLISHED package that declares UNLICENSED', () => {
      write('LICENSE', proprietary);

      const result = ProjectLicenseAnalyzerValidation.validateProjectLicense(
        root,
        { license: 'UNLICENSED' } as never
      );

      expect(result.violations.some(v => /UNLICENSED/i.test(v))).toBe(true);
    });

    it('reports an unrecognised licence as unknown, not as a mismatch', () => {
      write('LICENSE', 'Custom Dual Licence — terms on request.\n');

      const consistency =
        ProjectLicenseAnalyzerValidation.validateLicenseConsistency(
          'ACME-Custom-1.0',
          path.join(root, 'LICENSE')
        );

      // "I cannot determine this" and "these do not match" are different
      // claims. Only one of them is a violation.
      expect(consistency.determinable).toBe(false);

      const result = ProjectLicenseAnalyzerValidation.validateProjectLicense(
        root,
        { private: true, license: 'ACME-Custom-1.0' } as never
      );
      expect(result.violations.some(v => /mismatch/i.test(v))).toBe(false);
    });
  });

  describe('SAST speaks Python', () => {
    const pythonProject = (): void => {
      write('pyproject.toml', '[project]\nname="svc"\nversion="0.1.0"\n');
      write('app/main.py', 'x = 1\n');
    };

    it('recognises bandit in the pre-commit gate as SAST', () => {
      pythonProject();
      write(
        '.pre-commit-config.yaml',
        'repos:\n  - repo: local\n    hooks:\n      - id: bandit\n        entry: bandit -c pyproject.toml\n'
      );

      const result = SASTAnalyzerService.analyze(root);

      expect(result.configured).toBe(true);
      expect(result.tools).toContain('bandit');
    });

    it('recognises [tool.bandit] in pyproject.toml as SAST', () => {
      write(
        'pyproject.toml',
        '[project]\nname="svc"\nversion="0.1.0"\n\n[tool.bandit]\nexclude_dirs = ["tests"]\n'
      );
      write('app/main.py', 'x = 1\n');

      expect(SASTAnalyzerService.analyze(root).configured).toBe(true);
    });

    it("recognises ruff's flake8-bandit rules as SAST", () => {
      write(
        'pyproject.toml',
        '[project]\nname="svc"\nversion="0.1.0"\n\n[tool.ruff.lint]\nselect = ["E", "F", "S"]\n'
      );
      write('app/main.py', 'x = 1\n');

      const result = SASTAnalyzerService.analyze(root);

      expect(result.configured).toBe(true);
      expect(result.tools).toContain('ruff (flake8-bandit)');
    });

    it('still reports SAST as missing when a Python gate has none', () => {
      pythonProject();
      write(
        '.pre-commit-config.yaml',
        'repos:\n  - repo: local\n    hooks:\n      - id: black\n        entry: black\n'
      );

      // Not an exemption: a Python project with no SAST still fails.
      expect(SASTAnalyzerService.analyze(root).configured).toBe(false);
    });

    it('does not credit a non-Python project for a stray "bandit" string', () => {
      write('package.json', JSON.stringify({ name: 'n', version: '1.0.0' }));
      write('README.md', 'we should probably add bandit one day\n');

      expect(SASTAnalyzerService.analyze(root).configured).toBe(false);
    });
  });
});
