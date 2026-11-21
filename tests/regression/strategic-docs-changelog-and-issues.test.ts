/**
 * Strategic Document Updates asked every project for a PROJECT_STATUS.md /
 * ROADMAP.md. A project that keeps a CHANGELOG (where it has been) and an
 * issue tracker (where it is going) already keeps that record; a third
 * document restating both is the one that rots first. It is not asked for
 * one any more. A project with neither is asked, as before.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { StrategicDocumentUpdatesLaw } from '../../src/laws/documentation/strategic-document-updates';
import { FileUtils } from '../../src/utils';

const roots: string[] = [];
afterAll(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
});

function project(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-strategic-'));
  roots.push(root);
  for (const [rel, content] of Object.entries(files)) {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  return root;
}

const BASE: Record<string, string> = {
  'README.md':
    '# app\n\n## Installation\n\nnpm i\n\n## Usage\n\nrun it\n\n## Contributing\n\nPRs welcome\n',
  'CHANGELOG.md': '# Changelog\n\n## [1.0.0]\n\n- first release\n',
  'package.json': JSON.stringify({ name: 'app', version: '1.0.0' }),
};

const STATUS = 'Missing PROJECT_STATUS.md file';
const violations = async (files: Record<string, string>): Promise<string[]> =>
  (
    await StrategicDocumentUpdatesLaw.check({
      projectRoot: project(files),
      config: FileUtils.getMinimalDefaultConfig(),
    })
  ).violations ?? [];

describe('Strategic Document Updates: a CHANGELOG and an issue tracker are the status record', () => {
  it.each([
    [
      'a bugs URL in package.json',
      {
        'package.json': JSON.stringify({
          name: 'app',
          version: '1.0.0',
          bugs: { url: 'https://example.org/app/issues' },
        }),
      },
    ],
    [
      'GitHub issue templates',
      { '.github/ISSUE_TEMPLATE/bug.yml': 'name: Bug\n' },
    ],
    [
      'GitLab issue templates',
      { '.gitlab/issue_templates/Bug.md': '## Bug\n' },
    ],
    [
      'an Issues URL in pyproject.toml',
      {
        'pyproject.toml':
          '[project]\nname = "app"\n\n[project.urls]\nIssues = "https://example.org/app/issues"\n',
      },
    ],
  ])('CHANGELOG + %s: no status file is asked for', async (_label, extra) => {
    expect(await violations({ ...BASE, ...extra })).toEqual([]);
  });

  it('red control: a CHANGELOG with no issue tracker still needs a status file', async () => {
    expect(await violations(BASE)).toEqual([STATUS]);
  });

  it('red control: an issue tracker with no CHANGELOG is not the record either', async () => {
    const { 'CHANGELOG.md': _changelog, ...noChangelog } = BASE;
    const found = await violations({
      ...noChangelog,
      '.github/ISSUE_TEMPLATE/bug.yml': 'name: Bug\n',
    });
    expect(found).toContain(STATUS);
    expect(found).toContain('Missing CHANGELOG.md file');
  });

  it('a ROADMAP.md still satisfies it on its own', async () => {
    expect(
      await violations({ ...BASE, 'ROADMAP.md': '# Roadmap\n\n- next\n' })
    ).toEqual([]);
  });
});
