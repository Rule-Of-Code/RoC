/**
 * This package runs no code when it is installed.
 *
 * It used to: a `postinstall` hook wrote `ROC-RECOMMENDED.ruleofcode.config.json`
 * into the consumer's project root on every `npm install`, CI included. Useful,
 * entirely ours, and never able to fail an install — and still the wrong shape.
 * A package that executes code the moment it lands runs before anyone types a
 * command, and it wrote a file nobody asked for into someone else's repository.
 *
 * A tool that asks consumers to hold their dependencies to a standard has to
 * hold itself to the same one. The capability did not go away — it is
 * `ruleofcode recommend`, on request — so the install surface is now zero, and
 * this test keeps it there.
 *
 * `prepare` and `prepack` are deliberately allowed: npm runs those for THIS
 * repository when developing or publishing, never for a consumer installing
 * from the registry.
 */
import { PackageJsonOperations } from '../../src/utils/package-json-operations';
import { PathOperations } from '../../src/utils/path-operations';

/** Lifecycle scripts npm runs in a CONSUMER's install. */
const CONSUMER_INSTALL_SCRIPTS = ['preinstall', 'install', 'postinstall'];

describe('regression: the package runs nothing at install time', () => {
  const pkg = PackageJsonOperations.loadProjectPackageJson(
    PathOperations.resolve(__dirname, '..', '..')
  ) as { scripts?: Record<string, string>; files?: string[] } | null;

  it('reads its own package.json', () => {
    expect(pkg).not.toBeNull();
    expect(pkg?.scripts).toBeDefined();
  });

  it.each(CONSUMER_INSTALL_SCRIPTS)(
    'declares no %s script',
    (lifecycle: string) => {
      expect(pkg?.scripts?.[lifecycle]).toBeUndefined();
    }
  );

  it('ships no install hook in the published files', () => {
    const shipped = pkg?.files ?? [];
    expect(shipped.some(f => /postinstall|preinstall/i.test(f))).toBe(false);
  });

  it('still ships the generator the recommend command needs', () => {
    // Removing the hook must not remove the capability: `ruleofcode recommend`
    // requires this file at runtime, and it is not part of dist.
    expect(pkg?.files ?? []).toContain('scripts/recommend-config.js');
  });
});
