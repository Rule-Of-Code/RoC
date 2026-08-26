import * as fs from 'fs';
import * as path from 'path';

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
  const readme = (): string =>
    fs.readFileSync(path.join(__dirname, '../../README.md'), 'utf8');

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
      ['Frontend (Angular/NgRx + FE architecture)', 'frontend'],
      ['Python (FastAPI, Clean Architecture/CQRS)', 'python'],
      ['TypeScript', 'typescript'],
    ])('%s states the real count', (label, stack) => {
      const row = readme()
        .split('\n')
        .find(line => line.startsWith(`| ${label} |`));

      expect(row).toBeDefined();
      expect(row).toContain(`| ${byStack(stack as string | undefined)} |`);
    });

    /** The rows must account for every law, or one scope is missing. */
    it('the rows sum to the total', () => {
      const scopes = [undefined, 'frontend', 'python', 'typescript'];
      const summed = scopes.reduce((sum, s) => sum + byStack(s), 0);

      expect(summed).toBe(total());
    });
  });
});