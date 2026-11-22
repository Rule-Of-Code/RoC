/**
 * #486 — package.json, tsconfig.json and ESLint .json configs were read with
 * RoC's own config loader, which returns null for any JSON without
 * ignores/includes/laws. Laws then passed silently, reported a file they never
 * read as missing, or put a TypeError text in the findings. Each case here was
 * red on 8b5a6ff.
 */

import path from 'path';

import { CodeComplexityControlLaw } from '../../src/checkers/code-quality-laws/code-complexity-control';
import { DeadCodeEliminationLaw } from '../../src/checkers/code-quality-laws/dead-code-elimination';
import { MagicNumberPreventionLaw } from '../../src/checkers/code-quality-laws/magic-number-prevention';
import { NamingConventionEnforcementLaw } from '../../src/checkers/code-quality-laws/naming-convention-enforcement';
import { ZeroToleranceStrictLaw } from '../../src/checkers/code-quality-laws/zero-tolerance-strict';
import { AutomationFirstLaw } from '../../src/checkers/sacred-laws/automation-first';
import { ContinuousComplianceLaw } from '../../src/checkers/sacred-laws/continuous-compliance';
import { ZeroToleranceLaw } from '../../src/checkers/sacred-laws/zero-tolerance';
import { SecurityVulnerabilityResponseLaw } from '../../src/checkers/security-laws/security-vulnerability-response';
import { LicenseCompatibilityChecker } from '../../src/laws/security/dependency-scanning/license-checker';
import { readJsonManifest } from '../../src/utils/json-manifest';
import { SecurityPolicyChecker } from '../../src/utils/security/security-policy-checker';
import {
  INVALID,
  json,
  texts,
  TYPE_ERROR,
  useTempProject,
} from './foreign-json-486.helpers';

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

describe('Absolute Zero Tolerance Doctrine (tsconfig)', () => {
  const strictFinding = 'TypeScript strict mode not enabled';

  it('reads strict from a JSONC tsconfig', () => {
    write(
      'tsconfig.json',
      '{\n // c\n "compilerOptions": { "strict": true, },\n}'
    );
    expect(ZeroToleranceStrictLaw.check(context()).violations).not.toContain(
      strictFinding
    );
  });

  it('finds strict: false even when the text has "strict" and "true"', () => {
    write(
      'tsconfig.json',
      json({ compilerOptions: { strict: false, sourceMap: true } })
    );
    expect(ZeroToleranceStrictLaw.check(context()).violations).toContain(
      strictFinding
    );
  });

  it('says NOT read for an invalid tsconfig instead of passing it', () => {
    write('tsconfig.json', '{ "compilerOptions": { "strict": true, ');
    const violations = ZeroToleranceStrictLaw.check(context())
      .violations as string[];
    expect(violations).not.toContain(strictFinding);
    expect(
      violations.some(v =>
        /^tsconfig\.json is not valid JSON .* — its compiler options were NOT read$/.test(
          v
        )
      )
    ).toBe(true);
  });
});

describe('Zero Tolerance Doctrine (sacred)', () => {
  const strictTsconfig = json({
    compilerOptions: { strict: true, noImplicitAny: true },
  });

  it.each([
    ['.eslintrc.json', json({ rules: {} })],
    ['.eslintrc.yml', 'rules: {}\n'],
    ['eslint.config.cjs', 'module.exports = [];\n'],
  ])('counts %s as an ESLint config', (file, text) => {
    write('tsconfig.json', strictTsconfig);
    write(file, text);
    expect(ZeroToleranceLaw.check(context()).violations).toEqual([]);
  });

  it('counts package.json eslintConfig as an ESLint config', () => {
    write('tsconfig.json', strictTsconfig);
    write('package.json', json({ name: 'x', eslintConfig: { rules: {} } }));
    expect(ZeroToleranceLaw.check(context()).violations).toEqual([]);
  });

  it('still finds no ESLint config when there is none', () => {
    write('tsconfig.json', strictTsconfig);
    write('package.json', json({ name: 'x' }));
    expect(ZeroToleranceLaw.check(context()).violations).toEqual([
      'ESLint configuration not found',
    ]);
  });

  it('says NOT read for an invalid tsconfig, not "strict mode not enabled"', () => {
    write('tsconfig.json', '{ "compilerOptions": { "strict": true, ');
    write('.eslintrc.json', json({ rules: {} }));
    const violations = ZeroToleranceLaw.check(context()).violations as string[];
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatch(
      /^tsconfig\.json is not valid JSON .* — strict and noImplicitAny were NOT read$/
    );
  });

  it('reads strict from the extends chain', () => {
    write('tsconfig.base.json', strictTsconfig);
    write('tsconfig.json', json({ extends: './tsconfig.base.json' }));
    write('.eslintrc.json', json({ rules: {} }));
    expect(ZeroToleranceLaw.check(context()).violations).toEqual([]);
  });

  it('still finds a tsconfig without strict', () => {
    write('tsconfig.json', json({ compilerOptions: { strict: false } }));
    write('.eslintrc.json', json({ rules: {} }));
    expect(ZeroToleranceLaw.check(context()).violations).toEqual([
      'TypeScript strict mode not enabled',
      'TypeScript noImplicitAny not enabled',
    ]);
  });
});

describe('Naming Convention Enforcement (ESLint .json)', () => {
  const noConfig = 'No ESLint configuration found';
  const naming = {
    rules: {
      '@typescript-eslint/naming-convention': [
        'error',
        { selector: 'default', format: ['camelCase'] },
      ],
    },
  };

  it('reads .eslintrc.json', () => {
    write('.eslintrc.json', json(naming));
    const result = NamingConventionEnforcementLaw.check(context());
    expect(texts(result)).not.toContain(noConfig);
    expect(result.violations).not.toContain(
      'No naming convention rules configured in ESLint'
    );
  });

  it('reads package.json eslintConfig', () => {
    write('package.json', json({ name: 'x', eslintConfig: naming }));
    expect(
      texts(NamingConventionEnforcementLaw.check(context()))
    ).not.toContain(noConfig);
  });

  it('says NOT read for an invalid .eslintrc.json', () => {
    write('.eslintrc.json', INVALID);
    const violations = NamingConventionEnforcementLaw.check(context())
      .violations as string[];
    expect(violations).not.toContain(noConfig);
    expect(
      violations.some(v =>
        /^\.eslintrc\.json is not valid JSON .* — its naming rules were NOT read$/.test(
          v
        )
      )
    ).toBe(true);
  });
});

describe('Code quality laws reading the ESLint config', () => {
  const pkg = json({ name: 'x', devDependencies: { eslint: '^9.0.0' } });

  it('Dead Code Elimination reads .eslintrc.json rules', () => {
    write('package.json', pkg);
    write('.eslintrc.json', json({ rules: { 'no-unused-vars': 'error' } }));
    expect(DeadCodeEliminationLaw.check(context()).violations).not.toContain(
      'ESLint dead code detection rules not configured'
    );
  });

  it('Dead Code Elimination says NOT read for an invalid .eslintrc.json', () => {
    write('package.json', pkg);
    write('.eslintrc.json', INVALID);
    const violations = DeadCodeEliminationLaw.check(context())
      .violations as string[];
    expect(violations).not.toContain(
      'ESLint dead code detection rules not configured'
    );
    expect(violations.some(v => /^\.eslintrc\.json .* NOT read$/.test(v))).toBe(
      true
    );
  });

  // Fail-open places: the config was never read, so a missing rule was never
  // seen. Read now, the missing rule is a finding.
  it('Code Complexity Control finds an .eslintrc.json without complexity rules', () => {
    write('package.json', pkg);
    write('.eslintrc.json', json({ rules: { 'no-console': 'error' } }));
    expect(CodeComplexityControlLaw.check(context()).violations).toContain(
      'ESLint complexity rules not configured'
    );
  });

  it('Code Complexity Control passes an .eslintrc.json with them', () => {
    write('package.json', pkg);
    write('.eslintrc.json', json({ rules: { complexity: ['error', 10] } }));
    expect(CodeComplexityControlLaw.check(context()).violations).not.toContain(
      'ESLint complexity rules not configured'
    );
  });

  it('Magic Number Prevention finds an .eslintrc.json without the rule', () => {
    write('.eslintrc.json', json({ rules: { 'no-console': 'error' } }));
    expect(MagicNumberPreventionLaw.check(context()).violations).toContain(
      'ESLint magic numbers rule not configured'
    );
  });

  it('Magic Number Prevention passes an .eslintrc.json with the rule', () => {
    write('.eslintrc.json', json({ rules: { 'no-magic-numbers': 'error' } }));
    expect(MagicNumberPreventionLaw.check(context()).violations).not.toContain(
      'ESLint magic numbers rule not configured'
    );
  });
});

describe('Security Vulnerability Response (package.json)', () => {
  const addAudit =
    'Add npm audit script to package.json for regular vulnerability checks';

  it('sees the audit script', () => {
    write('package.json', json({ name: 'x', scripts: { audit: 'npm audit' } }));
    expect(
      texts(SecurityVulnerabilityResponseLaw.check(context()))
    ).not.toContain(addAudit);
  });

  it('still suggests one when there is none', () => {
    write('package.json', json({ name: 'x', scripts: { build: 'tsc' } }));
    expect(texts(SecurityVulnerabilityResponseLaw.check(context()))).toContain(
      addAudit
    );
  });

  it('says NOT read for an invalid package.json', () => {
    write('package.json', INVALID);
    const violations = SecurityVulnerabilityResponseLaw.check(context())
      .violations as string[];
    expect(
      violations.some(v =>
        /^package\.json is not valid JSON .* — its scripts and dependencies were NOT read$/.test(
          v
        )
      )
    ).toBe(true);
  });
});

describe.each([
  ['Automation First Principle', AutomationFirstLaw],
  ['Continuous Compliance Doctrine', ContinuousComplianceLaw],
])('%s (invalid package.json)', (_title, law) => {
  it('says NOT read, without a TypeError text', () => {
    write('package.json', INVALID);
    const result = law.check(context());
    expect(texts(result).filter(t => TYPE_ERROR.test(t))).toEqual([]);
    expect(
      (result.violations as string[]).some(v =>
        /^package\.json is not valid JSON .* — its scripts were NOT read$/.test(
          v
        )
      )
    ).toBe(true);
  });
});

describe('SecurityPolicyChecker.checkAuditResolve (package.json)', () => {
  it('sees the audit script', () => {
    write('package.json', json({ name: 'x', scripts: { audit: 'npm audit' } }));
    expect(
      SecurityPolicyChecker.checkAuditResolve(project.root).violations
    ).toEqual([]);
  });

  it('says NOT read for an invalid package.json', () => {
    write('package.json', INVALID);
    const { violations } = SecurityPolicyChecker.checkAuditResolve(
      project.root
    );
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatch(
      /^package\.json is not valid JSON .* — its scripts were NOT read$/
    );
  });
});

describe('LicenseCompatibilityChecker (package.json)', () => {
  const unspecified = 'Package license not specified in package.json';

  it('sees the license field (it threw on null before)', () => {
    write('package.json', json({ name: 'x', license: 'MIT' }));
    expect(
      LicenseCompatibilityChecker.checkLicenseCompatibility(context())
    ).not.toContain(unspecified);
  });

  it('says NOT read for an invalid package.json', () => {
    write('package.json', INVALID);
    const violations =
      LicenseCompatibilityChecker.checkLicenseCompatibility(context());
    expect(violations).not.toContain(unspecified);
    expect(
      violations.some(v =>
        /^package\.json .* its license was NOT read$/.test(v)
      )
    ).toBe(true);
  });
});
