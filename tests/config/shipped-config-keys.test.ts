/**
 * Every law key RuleOfCode ships must name a law.
 *
 * The project-type defaults are MERGED into the project's config before the
 * engine validates its keys, so a dead key in a default is reported to the
 * user as their own unknown law — a warning nothing in their config can
 * silence (#140). Our dead keys are our defect; this test is where we find
 * them, not the consumer's audit output.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { ConfigLoader } from '../../src/config/loader';
import {
  ANGULAR_CONFIG,
  DEFAULT_CONFIG,
  REACT_CONFIG,
} from '../../src/config/types';
import { RuleOfCodeAuditor } from '../../src/core/auditing/audit-engine';
import { ModularLawsRegistry } from '../../src/registry/modular-laws-registry';
import { isNonLawConfigKey } from '../../src/utils/law-identity';

type LawKeyed = {
  ignores?: { byRule?: Record<string, unknown> };
  includes?: { byRule?: Record<string, unknown> };
  laws?: {
    severity?: Record<string, unknown>;
    notApplicable?: Record<string, unknown>;
    enabled?: Record<string, unknown>;
  };
};

const KNOWN = new Set<string>(
  ModularLawsRegistry.getAll().flatMap(law =>
    ModularLawsRegistry.lawIdentityKeys(law)
  )
);

function unresolvedKeys(config: LawKeyed): string[] {
  const sections: Array<[string, Record<string, unknown> | undefined]> = [
    ['ignores.byRule', config.ignores?.byRule],
    ['includes.byRule', config.includes?.byRule],
    ['laws.severity', config.laws?.severity],
    ['laws.notApplicable', config.laws?.notApplicable],
    ['laws.enabled', config.laws?.enabled],
  ];
  return sections.flatMap(([label, section]) =>
    Object.keys(section ?? {})
      .filter(key => !isNonLawConfigKey(key) && !KNOWN.has(key))
      .map(key => `${label}: ${key}`)
  );
}

const TEMPLATES_DIR = path.resolve(__dirname, '..', '..', 'templates');

describe('shipped configs name only real laws', () => {
  it.each([
    ['DEFAULT_CONFIG', DEFAULT_CONFIG],
    ['ANGULAR_CONFIG', ANGULAR_CONFIG],
    ['REACT_CONFIG', REACT_CONFIG],
  ])('%s', (_name, config) => {
    expect(unresolvedKeys(config as LawKeyed)).toEqual([]);
  });

  const templates = fs
    .readdirSync(TEMPLATES_DIR)
    .filter(name => name.endsWith('.json'));

  it('ships at least one config template (the scan is not empty)', () => {
    expect(templates.length).toBeGreaterThan(0);
  });

  it.each(templates)('templates/%s', name => {
    const config = JSON.parse(
      fs.readFileSync(path.join(TEMPLATES_DIR, name), 'utf8')
    ) as LawKeyed;
    expect(unresolvedKeys(config)).toEqual([]);
  });

  it('ships no config template in a format the scan above cannot read', () => {
    // A .js template escaped this check once, carrying 24 dead keys.
    const other = fs
      .readdirSync(TEMPLATES_DIR)
      .filter(name => /config/.test(name) && !name.endsWith('.json'));
    expect(other).toEqual([]);
  });
});

describe('key validation reports the project, never RuleOfCode itself', () => {
  type Validator = {
    config: LawKeyed;
    validateSeverityOverrides: () => void;
  };

  let dir: string;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-shipped-keys-'));
    // An Angular project: the type whose defaults carried the dead keys.
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({ dependencies: { '@angular/core': '20.0.0' } })
    );
    warnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    warnSpy.mockRestore();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  function warningsFor(projectConfig: object): string[] {
    fs.writeFileSync(
      path.join(dir, 'ruleofcode.config.json'),
      JSON.stringify(projectConfig)
    );
    const auditor = new RuleOfCodeAuditor(
      ConfigLoader.load(dir),
      dir
    ) as unknown as Validator;
    auditor.validateSeverityOverrides();
    return warnSpy.mock.calls.map(call => String(call[0]));
  }

  it('an Angular project with empty byRule maps gets no unknown-law warning', () => {
    const warnings = warningsFor({
      ignores: { byRule: {} },
      includes: { byRule: {} },
    });
    expect(warnings.filter(w => w.includes('unknown law'))).toEqual([]);
  });

  it("still reports the project's own misspelled byRule key", () => {
    const warnings = warningsFor({
      ignores: { byRule: { 'magic-numbers': ['src/**'] } },
    });
    expect(warnings).toContainEqual(
      expect.stringContaining("ignores.byRule: unknown law 'magic-numbers'")
    );
  });

  it('checks byRule keys even when the config has no laws.severity at all', () => {
    const auditor = new RuleOfCodeAuditor(
      ConfigLoader.load(dir),
      dir
    ) as unknown as Validator;
    delete auditor.config.laws?.severity;
    auditor.config.ignores = { byRule: { 'magic-numbers': ['src/**'] } };
    auditor.validateSeverityOverrides();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("unknown law 'magic-numbers'")
    );
  });
});
