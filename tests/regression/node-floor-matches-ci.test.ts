/**
 * The Node version package.json promises is the one CI proves (#21).
 *
 * `engines.node` is a claim to every consumer: "this runs on that Node". It
 * said `>=16.0.0` while CI ran Node 20 only and the dependencies had moved on
 * (glob 11+ dropped Node before 20), so nothing proved the floor it named.
 * Three things have to agree, and this test reads each from its source:
 *
 *   1. package.json `engines.node` names the floor;
 *   2. the CI matrix runs exactly that floor as its lowest version, plus a
 *      newer one — the floor is tested, not assumed;
 *   3. no runtime dependency in the lockfile refuses the floor in its own
 *      `engines.node` — a dependency that raises its floor above ours makes
 *      our promise false the day it is installed.
 */
import * as fs from 'fs';
import * as path from 'path';

/** semver ships no types of its own and @types/semver is not a dependency. */
const semver = require('semver') as {
  minVersion(range: string): { major: number; version: string } | null;
  satisfies(
    version: string,
    range: string,
    options?: { includePrerelease?: boolean }
  ): boolean;
};

const ROOT = path.resolve(__dirname, '..', '..');
const read = (rel: string): string =>
  fs.readFileSync(path.join(ROOT, rel), 'utf8');

const pkg = JSON.parse(read('package.json')) as {
  engines?: { node?: string };
};
const FLOOR = '>=20';

/** The `node: [..]` list of the CI matrix, as major versions. */
function ciMatrixNodeMajors(): number[] {
  const ci = read('.github/workflows/ci.yml');
  const match = /^\s*node:\s*\[([^\]]*)\]/m.exec(ci);
  if (!match?.[1]) return [];
  return match[1]
    .split(',')
    .map(v => v.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean)
    .map(v => Number(v.split('.')[0]));
}

describe('Node floor (#21)', () => {
  it('package.json declares Node 20 or later', () => {
    expect(pkg.engines?.node).toBe(FLOOR);
  });

  it('the lowest Node in the CI matrix is the declared floor', () => {
    const majors = ciMatrixNodeMajors();
    const floor = semver.minVersion(pkg.engines?.node ?? '');
    expect(floor).not.toBeNull();
    expect(majors.length).toBeGreaterThanOrEqual(2);
    expect(Math.min(...majors)).toBe(floor!.major);
    expect(Math.max(...majors)).toBeGreaterThan(floor!.major);
  });

  it('every CI step runs on the matrix version, not a pinned one', () => {
    const ci = read('.github/workflows/ci.yml');
    const pinned = [...ci.matchAll(/node-version:\s*(.+)$/gm)]
      .map(m => (m[1] ?? '').trim())
      .filter(v => v !== '${{ matrix.node }}');
    expect(pinned).toEqual([]);
  });

  it('no runtime dependency refuses the declared floor', () => {
    const floor = semver.minVersion(pkg.engines?.node ?? '')!.version;
    const lock = JSON.parse(read('package-lock.json')) as {
      packages: Record<
        string,
        { dev?: boolean; optional?: boolean; engines?: { node?: string } }
      >;
    };
    const refusing = Object.entries(lock.packages)
      .filter(([name, entry]) => name !== '' && !entry.dev)
      .filter(([, entry]) => typeof entry.engines?.node === 'string')
      .filter(
        ([, entry]) =>
          !semver.satisfies(floor, entry.engines!.node!, {
            includePrerelease: true,
          })
      )
      .map(([name, entry]) => `${name} (${entry.engines!.node})`);
    expect(refusing).toEqual([]);
  });
});
