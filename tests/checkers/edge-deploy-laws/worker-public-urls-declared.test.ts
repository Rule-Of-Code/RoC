/**
 * #363 — a wrangler configuration without explicit workers_dev and
 * preview_urls leaves the Worker's public addresses to Wrangler; a secret
 * uploaded before the first deploy creates an empty Worker in CI.
 */
import { WorkerPublicUrlsDeclaredLaw } from '../../../src/checkers/edge-deploy-laws/worker-public-urls-declared';
import { EDGE_DEPLOY_SECURITY_LAWS } from '../../../src/data/edge-deploy-security-laws';
import { lawRequirementsMet } from '../../../src/utils/law-requirements';
import { repo } from '../../utils/git-fixture';
import { ctx, project, removeProjects } from '../toolkit-fixture';

afterAll(removeProjects);

const LAW = EDGE_DEPLOY_SECURITY_LAWS.find(
  law => law.checkFunction === 'WorkerPublicUrlsDeclaredLaw.check'
);
const check = (files: Record<string, string>) =>
  WorkerPublicUrlsDeclaredLaw.check(ctx(project(files)));

const BARE =
  'name = "api-edge"\nmain = "src/index.ts"\ncompatibility_date = "2025-01-01"\n\n[env.staging]\nworkers_dev = false\n';

describe('#363 Worker Public URLs Declared — acceptance', () => {
  it('red: a wrangler.toml without the keys → a finding naming both', () => {
    const result = check({ 'edge/wrangler.toml': BARE });
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      expect.stringMatching(
        /^edge\/wrangler\.toml:1: workers_dev and preview_urls not set at the top level/
      ),
    ]);
  });

  it('red: one key set → a finding naming the other', () => {
    const result = check({
      'wrangler.toml': 'name = "w"\nworkers_dev = false\n',
    });
    expect(result.violations).toEqual([
      expect.stringMatching(/^wrangler\.toml:1: preview_urls not set/),
    ]);
  });

  it('red: wrangler.jsonc without the keys', () => {
    const jsonc =
      '{\n  // edge\n  "name": "w",\n  "main": "src/index.ts",\n}\n';
    expect(check({ 'wrangler.jsonc': jsonc }).violations).toEqual([
      expect.stringMatching(/^wrangler\.jsonc:3: workers_dev and preview_urls/),
    ]);
  });

  it.each([
    ['both false', 'name = "w"\nworkers_dev = false\npreview_urls = false\n'],
    [
      'both true (any value)',
      'name = "w"\nworkers_dev = true\npreview_urls = true\n',
    ],
  ])('green: %s', (_name, toml) => {
    const result = check({ 'wrangler.toml': toml });
    expect(result.passed).toBe(true);
    expect(result.message).toMatch(
      /1 wrangler configuration\(s\) \/ secret upload\(s\) judged in 1 file\(s\)/
    );
    expect(result.metrics).toMatchObject({
      filesRead: 1,
      judged: 1,
      configurations: 1,
    });
  });

  it('green: wrangler.json with both keys', () => {
    expect(
      check({
        'wrangler.json':
          '{"name":"w","workers_dev":false,"preview_urls":false}',
      }).passed
    ).toBe(true);
  });

  it('a key only under [env.x] does not count for the top level', () => {
    expect(
      check({
        'wrangler.toml':
          'name = "w"\n[env.prod]\nworkers_dev = false\npreview_urls = false\n',
      }).passed
    ).toBe(false);
  });
});

describe('#363 — secret upload before the first deploy', () => {
  const OK = 'name = "w"\nworkers_dev = false\npreview_urls = false\n';

  it('red: a CI step uploads the secret before the Worker is deployed', () => {
    const yml =
      'jobs:\n  d:\n    steps:\n      - run: echo "$K" | npx wrangler secret put ORIGIN_KEY\n      - run: npx wrangler deploy\n';
    const result = check({
      'wrangler.toml': OK,
      '.github/workflows/edge.yml': yml,
    });
    expect(result.violations).toEqual([
      expect.stringMatching(
        /^\.github\/workflows\/edge\.yml:4: npx wrangler secret put ORIGIN_KEY runs before the first wrangler deploy/
      ),
    ]);
  });

  it('green: deploy first, then the secret', () => {
    const sh =
      'npx wrangler deploy --env prod\nprintf %s "$K" | npx wrangler secret put ORIGIN_KEY --env prod\n';
    const result = check({ 'wrangler.toml': OK, 'scripts/edge.sh': sh });
    expect(result.passed).toBe(true);
    expect(result.metrics).toMatchObject({ judged: 2 });
  });

  it('another Worker deployed earlier does not count; no deploy of it in the file → a note, not judged', () => {
    const sh = 'wrangler deploy --name a\nwrangler secret put K --name b\n';
    const result = check({ 'scripts/edge.sh': sh });
    expect(result.judgedNothing).toBe(true);
    expect(result.suggestions?.join(' ')).toMatch(
      /scripts\/edge\.sh:2: .* no wrangler deploy of the same Worker/
    );
  });
});

describe('#363 — selection is the subject', () => {
  it('a project without a wrangler configuration or a secret upload does not select the law', () => {
    const root = project({
      'package.json': '{"name":"a","scripts":{"deploy":"wrangler deploy"}}',
      'firebase.json': '{}',
    });
    expect(lawRequirementsMet(LAW?.requires, root)).toBe(false);
  });

  it('a secret upload mentioned in a comment does not select it', () => {
    expect(
      lawRequirementsMet(
        LAW?.requires,
        project({ 'scripts/x.sh': '# later: wrangler secret put K\n' })
      )
    ).toBe(false);
  });

  it('an untracked config selects and is judged; a git-ignored one selects nothing', () => {
    const untracked = repo({ 'wrangler.toml': BARE, 'README.md': '#\n' }, [
      'README.md',
    ]);
    expect(lawRequirementsMet(LAW?.requires, untracked)).toBe(true);
    expect(
      WorkerPublicUrlsDeclaredLaw.check(ctx(untracked)).violations
    ).toHaveLength(1);
    const ignored = repo(
      {
        'wrangler.toml': BARE,
        'README.md': '#\n',
        '.gitignore': 'wrangler.toml\n',
      },
      ['README.md', '.gitignore']
    );
    expect(lawRequirementsMet(LAW?.requires, ignored)).toBe(false);
  });

  it('ignores.global leaves the config out of the gate', () => {
    expect(
      lawRequirementsMet(
        LAW?.requires,
        project({ 'legacy/wrangler.toml': BARE }),
        ['legacy/**']
      )
    ).toBe(false);
  });

  it('a config fixture under tests/ does not select it', () => {
    expect(
      lawRequirementsMet(
        LAW?.requires,
        project({ 'tests/fixtures/wrangler.toml': BARE })
      )
    ).toBe(false);
  });

  it('no file read → judged nothing', () => {
    expect(check({ 'README.md': '#\n' }).judgedNothing).toBe(true);
  });
});
