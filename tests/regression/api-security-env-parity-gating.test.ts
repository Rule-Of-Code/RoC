/**
 * #428, the two laws still open — API Security Standards and Environment
 * Parity Standards are selected for every TypeScript project.
 *
 * Both are about something that runs for users: an API perimeter (HTTPS,
 * authentication, rate limiting, CORS, headers) and the environments a
 * service is deployed to (a `.env.example` contract for dev/staging/prod). A
 * CLI tool or a library has neither: no endpoint to authenticate, no
 * environment to keep in parity. API Security Standards declares only
 * `stack: 'typescript'` and Environment Parity Standards declares nothing, so
 * both judge such a project and report findings that cannot be fixed
 * honestly. The laws #428 already gated (CDN, Performance Monitoring, Incident
 * Response, Launch Readiness, ...) use REQUIRES_PRODUCTION_SUBJECT; these two
 * are asserted the same way, through the card's own `requires`.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { ALL_ENHANCED_CONSTITUTIONAL_LAWS } from '../../src/data/enhanced-laws';
import { lawRequirementsMet } from '../../src/utils/law-requirements';

const API = 'API Security Standards';
const ENV = 'Environment Parity Standards';

const roots: string[] = [];
afterAll(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
});

function project(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-428-api-env-'));
  roots.push(root);
  for (const [rel, content] of Object.entries(files)) {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  return root;
}

function pkg(deps: Record<string, string> = {}): string {
  return JSON.stringify({
    name: 'fixture',
    version: '1.0.0',
    bin: { fixture: 'dist/cli.js' },
    dependencies: deps,
    devDependencies: { typescript: '5.9.3', jest: '30.0.0' },
  });
}

/** A TypeScript CLI: reads NODE_ENV for its log level, serves nothing. */
const CLI_BASE: Record<string, string> = {
  'package.json': pkg({ commander: '14.0.0' }),
  'src/cli.ts':
    "import { Command } from 'commander';\nconst verbose = process.env.NODE_ENV !== 'production';\nnew Command().option('-v', String(verbose)).parse();\n",
  'tests/cli.test.ts': "it('runs', () => expect(1).toBe(1));\n",
  '.env.example': 'LOG_LEVEL=info\n',
};

const law = (title: string) => {
  const found = ALL_ENHANCED_CONSTITUTIONAL_LAWS.find(l => l.title === title);
  if (!found) throw new Error(`law not in the registry: ${title}`);
  return found;
};
const selected = (title: string, root: string): boolean =>
  lawRequirementsMet(law(title).requires, root, []);

describe('#428 API Security Standards and Environment Parity Standards need a production subject', () => {
  it.each([API, ENV])('%s declares requires', title => {
    expect(law(title).requires).toBeDefined();
  });

  it.each([API, ENV])(
    'a TypeScript CLI / library does not select %s',
    title => {
      expect(selected(title, project(CLI_BASE))).toBe(false);
    }
  );

  it.each([
    ['an Express service', { 'package.json': pkg({ express: '5.1.0' }) }],
    ['a Dockerfile', { Dockerfile: 'FROM node:22\n' }],
    ['an Angular app', { 'package.json': pkg({ '@angular/core': '20.0.0' }) }],
  ])('%s selects both', (_label, extra) => {
    const root = project({ ...CLI_BASE, ...extra });
    expect([API, ENV].filter(title => selected(title, root))).toEqual([
      API,
      ENV,
    ]);
  });
});
