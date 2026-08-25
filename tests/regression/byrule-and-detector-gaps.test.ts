import { execSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { CommitSizeControlLaw } from '../../src/checkers/git-laws/commit-size-control';
import { MagicNumberPreventionLaw } from '../../src/checkers/code-quality-laws/magic-number-prevention';
import { LaunchReadinessChecklistLaw } from '../../src/laws/deployment/launch-readiness-checklist';
import { ModularLawsRegistry } from '../../src/registry/modular-laws-registry';
import { DEFAULT_CONFIG } from '../../src/config/types';
import { FileUtils } from '../../src/utils';

describe('byRule keys, datetime literals, merge sampling and launch artefacts', () => {
  let root: string;
  const write = (rel: string, content: string): void => {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  };

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-gaps-'));
  });
  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  /**
   * A `byRule` key is a law SLUG. A key that names no law filters nothing and
   * says nothing about it — the quietest of the three config mistakes, because
   * the entry reads as an exemption and is inert.
   *
   * Our own defaults carried eleven such keys.
   */
  describe('byRule keys name real laws', () => {
    const knownKeys = (): Set<string> => {
      const known = new Set<string>();
      for (const law of ModularLawsRegistry.getAll()) {
        for (const key of ModularLawsRegistry.lawIdentityKeys(law)) {
          known.add(key);
        }
      }
      return known;
    };

    it('ships no ignores.byRule key that matches no law', () => {
      const known = knownKeys();
      const keys = Object.keys(DEFAULT_CONFIG.ignores.byRule ?? {});

      expect(keys.filter(key => !known.has(key))).toEqual([]);
    });

    it('ships no includes.byRule key that matches no law', () => {
      const known = knownKeys();
      const keys = Object.keys(DEFAULT_CONFIG.includes?.byRule ?? {});

      expect(keys.filter(key => !known.has(key))).toEqual([]);
    });

    it('exempts a file when byRule is keyed by the law id', () => {
      // The slug form already worked, via the key the registry publishes before
      // each law. The id form silently filtered nothing, because the id was
      // never threaded down to the file scan.
      write('package.json', '{"name":"x"}');
      write('src/fixtures.ts', 'export function f(x: number) { return x > 4242; }');

      const config = FileUtils.getMinimalDefaultConfig();
      config.ignores.byRule = { 'law-42': ['src/fixtures.ts'] };

      const result = MagicNumberPreventionLaw.check({
        projectRoot: root,
        config,
        lawId: 'law-42',
      });

      expect(
        (result.violations ?? []).some(v => /Magic numbers/.test(v))
      ).toBe(false);
    });

    it('still reports the file when no rule entry matches', () => {
      write('package.json', '{"name":"x"}');
      write('src/fixtures.ts', 'export function f(x: number) { return x > 4242; }');

      const config = FileUtils.getMinimalDefaultConfig();
      config.ignores.byRule = { 'some-other-law': ['src/fixtures.ts'] };

      const result = MagicNumberPreventionLaw.check({
        projectRoot: root,
        config,
        lawId: 'law-42',
      });

      expect((result.violations ?? []).some(v => /Magic numbers/.test(v))).toBe(
        true
      );
    });
  });

  /**
   * The date half of an ISO 8601 literal was exempt; the time half was not, so
   * `:30:00` reported `30` and `00`. Splitting a datetime into named
   * per-component constants is not a readability gain — it is standard syntax.
   */
  describe('a datetime literal is not a magic number', () => {
    const found = (source: string): string[] =>
      (
        MagicNumberPreventionLaw as unknown as {
          findMagicNumbers: (s: string) => string[];
        }
      ).findMagicNumbers(source);

    it.each([
      ["new Date('2026-08-15T20:00:00Z')"],
      ["new Date('2026-08-16T05:30:00Z')"],
      ["const at = '20:00';"],
      ["const span = '08:15:42';"],
    ])('accepts %s', source => {
      expect(found(source)).toEqual([]);
    });

    it('still reports a threshold with no name', () => {
      expect(found('if (elapsed > 86400) { retry(); }')).toContain('86400');
    });

    it('still reports a literal argument', () => {
      expect(found('setTimeout(fn, 30000);')).toContain('30000');
    });
  });

  /**
   * A unit is a SUFFIX OF A NUMBER, not a substring of a nearby word.
   *
   * The unit patterns were `/px|em|rem|%/` and `/ms|s\b/`, matched anywhere in
   * the ±10 character window: `em` inside "element", `ms` inside "params", and
   * `s\b` at the end of any plural. The law went quiet next to ordinary
   * English — `arr.slice(0, 250)` was exempt because of the "s" in "items".
   */
  describe('a unit exempts a number only when it is that number unit', () => {
    const found = (source: string): string[] =>
      (
        MagicNumberPreventionLaw as unknown as {
          findMagicNumbers: (s: string) => string[];
        }
      ).findMagicNumbers(source);

    it.each([
      ["const s = { transition: '300ms ease' };"],
      ["const t = '30s';"],
      ["const w = { width: '250px' };"],
      ["const g = { gap: '1.5rem' };"],
    ])('accepts a real unit in %s', source => {
      expect(found(source)).toEqual([]);
    });

    // `{ limit: 500 }` used to be listed here. It is exempt now, and
    // deliberately: an object property NAMES its number, which is the fix this
    // law asks for. The fixtures below keep the original point — a plural in a
    // nearby identifier is not a unit — without relying on that.
    it.each([
      ['const items = arr.slice(0, 250);', '250'],
      ['const params = collect(rows, 500);', '500'],
      ['const forms = rows.take(750);', '750'],
    ])('reports %s — a plural nearby is not a unit', (source, expected) => {
      expect(found(source)).toContain(expected);
    });

    it.each([
      ["const u = 'http://host:8080';"],
      ["const w = 'ws://localhost:4200/ws';"],
      ["const a = 'https://api.example.com:8443/v1';"],
    ])('accepts a port in %s', source => {
      expect(found(source)).toEqual([]);
    });

    /**
     * The port exemption must not leak to any number that follows a colon.
     *
     * This used to assert on `{retries:5000}`. That case is exempt now for a
     * different and legitimate reason — the property names it — so it can no
     * longer prove anything about the port pattern. A colon that is NOT a
     * property key can.
     */
    it('does not exempt a number because a colon precedes it', () => {
      expect(found('switch (k) { case 3: return 5000; }')).toContain('5000');
    });

    it('does not exempt a number because a word contains "port"', () => {
      expect(found('export function f() { return 4242; }')).toContain('4242');
    });
  });

  /**
   * `git log --stat` prints no diffstat for a merge commit, so a merge measured
   * as zero files and could never be oversized — while still occupying a slot
   * in the fixed sample. On a gitflow repository one release cycle produces
   * three of them, and the window narrowed exactly when activity was highest.
   */
  describe('commit size samples authored commits', () => {
    const git = (command: string): string =>
      execSync(command, {
        cwd: root,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });

    it('excludes merge commits from the sample', () => {
      git('git init -q');
      git('git config user.email t@example.com');
      git('git config user.name Test');
      write('a.txt', 'base\n');
      git('git add a.txt');
      git('git commit -qm base');
      git('git checkout -qb side');
      write('b.txt', 'side\n');
      git('git add b.txt');
      git('git commit -qm side');
      git('git checkout -q -');
      write('c.txt', 'main\n');
      git('git add c.txt');
      git('git commit -qm main');
      git('git merge side -m "merge side" --no-ff');

      const sampled = execSync(
        'git log --oneline --stat --no-merges --since="1 week ago" -n 10',
        { cwd: root, encoding: 'utf8' }
      );

      expect(sampled).not.toContain('merge side');
      expect(sampled).toContain('base');
      expect(sampled).toContain('side');
      expect(sampled).toContain('main');
    });

    it('the law itself no longer counts a merge as a sampled commit', () => {
      git('git init -q');
      git('git config user.email t@example.com');
      git('git config user.name Test');
      write('a.txt', 'base\n');
      git('git add a.txt');
      git('git commit -qm base');
      git('git checkout -qb side');
      write('b.txt', 'side\n');
      git('git add b.txt');
      git('git commit -qm side');
      git('git checkout -q -');
      write('c.txt', 'main\n');
      git('git add c.txt');
      git('git commit -qm main');
      git('git merge side -m "merge side" --no-ff');

      const result = CommitSizeControlLaw.check({
        projectRoot: root,
        config: FileUtils.getMinimalDefaultConfig(),
      });

      // Scoped to the size finding. The fixture is a bare repository, so the
      // law's separate documentation sub-check reports — that is correct and
      // not what this test is about.
      expect(
        (result.violations ?? []).some(v => /exceed the size limit/.test(v))
      ).toBe(false);
    });
  });

  /**
   * Both detectors matched a handful of exact paths, while the checklist check
   * beside them already matched by trailing path. A project with a real policy
   * lost the points for not having guessed our spelling.
   */
  describe('launch readiness recognises standard and first-party artefacts', () => {
    const security = (): boolean =>
      (
        LaunchReadinessChecklistLaw as unknown as {
          analyzeSecurityReview: (r: string) => { hasSecurityReview: boolean };
        }
      ).analyzeSecurityReview(root).hasSecurityReview;

    const monitoring = (): boolean =>
      (
        LaunchReadinessChecklistLaw as unknown as {
          analyzeMonitoringReadiness: (r: string) => {
            hasMonitoringReadiness: boolean;
          };
        }
      ).analyzeMonitoringReadiness(root).hasMonitoringReadiness;

    it('accepts SECURITY.md, the convention the host itself surfaces', () => {
      write('SECURITY.md', '# Security\n\nDisclosure process.\n');

      expect(security()).toBe(true);
    });

    it('accepts a security policy in a subdirectory', () => {
      write('docs/SECURITY.md', '# Security\n');

      expect(security()).toBe(true);
    });

    it('accepts a first-party monitoring config, not only vendor paths', () => {
      write('monitoring.config.js', 'module.exports = { webVitals: {} };');

      expect(monitoring()).toBe(true);
    });

    it('still reports a project carrying neither', () => {
      write('README.md', '# Nothing here\n');

      expect(security()).toBe(false);
      expect(monitoring()).toBe(false);
    });
  });
});