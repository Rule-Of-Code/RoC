import * as fs from 'fs';
import * as path from 'path';

import { ALL_ENHANCED_CONSTITUTIONAL_LAWS } from '../../src/data/enhanced-laws';
import { ModularLawsRegistry } from '../../src/registry/modular-laws-registry';

/**
 * The README advertised 173 laws while the registry held 169.
 *
 * That is exactly the defect this tool reports in other people's projects: a
 * number written by hand, in the place a reader trusts most, drifting away from
 * the thing it describes. Four laws were retired in 7.19.0 and the badge, the
 * prose, the scope table and a JSON example all kept the old figure.
 *
 * A count nobody can check is a claim, not a fact. These assertions make the
 * registry the source and the README the copy.
 */
describe('the README counts match the registry', () => {
  // Line endings normalised: a Windows checkout (core.autocrlf) has CRLF, and
  // an assertion spanning a line break must not depend on the platform.
  const readme = (): string =>
    fs
      .readFileSync(path.join(__dirname, '../../README.md'), 'utf8')
      .replace(/\r\n/g, '\n');

  const total = (): number => ModularLawsRegistry.getAll().length;

  const byStack = (stack: string | undefined): number =>
    ModularLawsRegistry.getAll().filter(law => law.stack === stack).length;

  it('the badge states the real total', () => {
    expect(readme()).toContain(`Constitutional%20Laws-${total()}-red.svg`);
  });

  it('the prose states the real total', () => {
    expect(readme()).toContain(`**${total()} laws**`);
  });

  it('the law-card example states the real total', () => {
    expect(readme()).toContain(`"registryTotal": ${total()}`);
  });

  it('the version in the law-card example is the published one', () => {
    const { version } = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf8')
    ) as { version: string };

    expect(readme()).toContain(`"version": "${version}"`);
  });

  describe('the scope table', () => {
    it.each([
      ['Universal', undefined],
      ['Frontend (Angular/NgRx, FE architecture, Ionic/Capacitor)', 'frontend'],
      ['Python (FastAPI, Clean Architecture/CQRS)', 'python'],
      ['TypeScript', 'typescript'],
    ])('%s states the real count', (label, stack) => {
      const row = readme()
        .split('\n')
        .find(line => line.startsWith(`| ${label} |`));

      expect(row).toBeDefined();
      expect(row).toContain(`| ${byStack(stack as string | undefined)} |`);
    });

    it('states how many frontend laws are gated on Ionic and on Capacitor', () => {
      const gatedOn = (prefix: string): number =>
        ModularLawsRegistry.getAll().filter(law =>
          (law.requires?.anyDependency ?? []).some(name =>
            name.startsWith(prefix)
          )
        ).length;

      expect(readme()).toContain(
        `Of the frontend laws, **${gatedOn('@ionic/')}** ${gatedOn('@ionic/') === 1 ? 'runs' : 'run'} only where an Ionic binding is declared and **${gatedOn('@capacitor/')}** only
where Capacitor is`
      );
    });

    /**
     * #394: "19 run only where @angular/core is declared" stayed at 19 while
     * the registry grew to 21. Counted by the sentence's own rule: a law runs
     * only where X is declared when its `requires.anyDependency` is exactly
     * [X] (other conditions may narrow it further; none widens it).
     */
    it('states how many laws are gated on @angular/core, @ngrx/store and rxjs', () => {
      const onlyWhere = (name: string): number =>
        ModularLawsRegistry.getAll().filter(law => {
          const deps = law.requires?.anyDependency ?? [];
          return deps.length === 1 && deps[0] === name;
        }).length;

      expect(readme()).toContain(
        `**${onlyWhere('@angular/core')}** run only where \`@angular/core\`
is declared, **${onlyWhere('@ngrx/store')}** only where \`@ngrx/store\` is, and **${onlyWhere('rxjs')}** only where \`rxjs\` is.`
      );
    });

    /** The rows must account for every law, or one scope is missing. */
    it('the rows sum to the total', () => {
      const scopes = [undefined, 'frontend', 'python', 'typescript'];
      const summed = scopes.reduce((sum, s) => sum + byStack(s), 0);

      expect(summed).toBe(total());
    });
  });

  /**
   * The "measured against the shipped registry" table said 70 / 67 / 58 while
   * the registry held 69 / 63 / 55 — the same hand-written drift, one section
   * further down, in a table whose whole claim is that it was measured.
   */
  describe('the satisfiedBy spread table', () => {
    const laws = ALL_ENHANCED_CONSTITUTIONAL_LAWS;
    const keys = [
      ...new Set(laws.flatMap(law => Object.keys(law.satisfiedBy ?? {}))),
    ];

    it.each(keys)('the `%s` row states the measured count and spread', key => {
      const carrying = laws.filter(
        law => law.satisfiedBy?.[key as 'angular'] !== undefined
      );
      const spread = new Map<string, number>();
      for (const law of carrying) {
        const stack = law.stack ?? 'universal';
        spread.set(stack, (spread.get(stack) ?? 0) + 1);
      }
      const row = readme()
        .split('\n')
        .find(line => line.startsWith(`| \`${key}\` | `));

      expect(row).toBeDefined();
      expect(row).toContain(`| ${carrying.length} |`);
      for (const [stack, count] of spread) {
        const label =
          stack === 'universal'
            ? `${count} universal`
            : `${count} \`${stack}\``;
        expect(row).toContain(label);
      }
    });

    // Counted by what the law CARRIES. This used to count every frontend law
    // without `requires`, which stopped meaning "Angular only" as soon as
    // React guidance was written for some of them.
    it('states how many frontend laws carry only Angular guidance', () => {
      const angularOnly = laws.filter(
        law =>
          law.stack === 'frontend' &&
          law.requires === undefined &&
          Object.keys(law.satisfiedBy ?? {}).join() === 'angular'
      ).length;

      // #558: the last one (No Risk Literals) was removed; the README says none.
      const expected =
        angularOnly === 0
          ? 'none of them carries only\n`satisfiedBy.angular`.'
          : angularOnly === 1
            ? '1 `frontend` law without a `requires` that carries only `satisfiedBy.angular`'
            : `The ${angularOnly} \`frontend\` laws without a \`requires\` carry only \`satisfiedBy.angular\`.`;
      expect(readme()).toContain(expected);
    });
  });

  /**
   * #394: numbers no test can derive are not written. The tests badge said
   * "14,300+ passing" (16,763 on 7.28.0) and the canary block showed three
   * profiles' law counts from an older release (six profiles now).
   */
  describe('no hand-written figure the suite cannot check', () => {
    it('the tests badge is the CI status, not a count', () => {
      expect(readme()).not.toMatch(/img\.shields\.io\/badge\/Tests-/);
      expect(readme()).toContain(
        'https://github.com/Rule-Of-Code/RoC/actions/workflows/ci.yml/badge.svg'
      );
    });

    it('the canary block names every canary profile and no law count', () => {
      const { STACKS } = require('../../scripts/release-canary') as {
        STACKS: Record<string, unknown>;
      };
      const section = readme().split('## 🐤 Canary')[1]?.split('\n## ')[0];

      expect(section).toBeDefined();
      expect(section).not.toMatch(/laws=\d/);
      for (const profile of Object.keys(STACKS))
        expect(section).toMatch(new RegExp(`^${profile}\\s+\\|`, 'm'));
    });
  });
});
