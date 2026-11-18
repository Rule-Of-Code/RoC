/**
 * TestServerLoopbackAddressMatch (#360): a test server bound to 127.0.0.1
 * only, called as http://localhost:…, makes each new connection try ::1
 * first. The finding names the bind and every client that calls it.
 */
import { TestServerLoopbackAddressMatchLaw } from '../../../src/checkers/measurement-laws/test-server-loopback-address-match';
import { ctx, project, removeProjects } from '../toolkit-fixture';

afterAll(removeProjects);

const run = (files: Record<string, string>) => TestServerLoopbackAddressMatchLaw.check(ctx(project(files)));

const MOCK_SERVER = `const http = require('http');
const PORT = process.env.MOCK_PORT || 4010;
const server = http.createServer((req, res) => res.end('{}'));
server.listen(PORT, '127.0.0.1');
`;
const TEST_ENV = `export const environment = {
  production: false,
  apiUrl: 'http://localhost:4010/api',
};
`;

describe('TestServerLoopbackAddressMatchLaw (#360)', () => {
  it('red: server on 127.0.0.1, client base URL http://localhost — the finding names both sides', () => {
    const result = run({
      'perf/mock-api.js': MOCK_SERVER,
      'src/environments/environment.e2e.ts': TEST_ENV,
    });
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      expect.stringMatching(
        /^perf\/mock-api\.js:4: the test server binds 127\.0\.0\.1 only on port 4010, while the client calls localhost — src\/environments\/environment\.e2e\.ts:3 \(http:\/\/localhost:4010\)/
      ),
    ]);
  });

  it('green: the client uses the same literal the server binds', () => {
    const result = run({
      'perf/mock-api.js': MOCK_SERVER,
      'src/environments/environment.e2e.ts': TEST_ENV.replace('localhost', '127.0.0.1'),
    });
    expect(result.violations).toEqual([]);
    expect(result.passed).toBe(true);
  });

  it('green: the server listens dual-stack', () => {
    const result = run({
      'perf/mock-api.js': MOCK_SERVER.replace("'127.0.0.1'", "'::'"),
      'src/environments/environment.e2e.ts': TEST_ENV,
    });
    expect(result.violations).toEqual([]);
  });

  it('green: the server also binds ::1 (both addresses)', () => {
    const result = run({
      'perf/mock-api.js': `${MOCK_SERVER}http.createServer(handler).listen(PORT, '::1');\n`,
      'src/environments/environment.e2e.ts': TEST_ENV,
    });
    expect(result.violations).toEqual([]);
  });

  it('a different port is a different server', () => {
    const result = run({
      'perf/mock-api.js': MOCK_SERVER,
      'src/environments/environment.e2e.ts': TEST_ENV.replace('4010', '4200'),
    });
    expect(result.violations).toEqual([]);
  });

  it('CLI binds and a Playwright webServer: uvicorn --host 127.0.0.1 against baseURL localhost', () => {
    const result = run({
      'playwright.config.ts': [
        'export default defineConfig({',
        "  use: { baseURL: 'http://localhost:8000' },",
        "  webServer: { command: 'uvicorn app.main:app --host 127.0.0.1 --port 8000', url: 'http://localhost:8000/health' },",
        '});',
      ].join('\n'),
    });
    expect(result.violations).toEqual([
      expect.stringMatching(
        /^playwright\.config\.ts:3: the test server binds 127\.0\.0\.1 only on port 8000, while the client calls localhost — playwright\.config\.ts:2 \(http:\/\/localhost:8000\), playwright\.config\.ts:3 \(http:\/\/localhost:8000\)/
      ),
    ]);
  });

  it('Python: an http.server tuple bind in a perf script, and a test script in package.json', () => {
    const result = run({
      'bench/serve_static.py':
        'from http.server import ThreadingHTTPServer\nThreadingHTTPServer(("127.0.0.1", 5500), Handler).serve_forever()\n',
      'package.json': JSON.stringify(
        {
          name: 'web',
          scripts: {
            start: 'ng serve',
            'test:perf': 'lighthouse http://localhost:5500 --quiet',
          },
        },
        null,
        2
      ),
    });
    expect(result.violations).toEqual([
      expect.stringMatching(/^bench\/serve_static\.py:2: .*port 5500.* package\.json:5 \(http:\/\/localhost:5500\)/),
    ]);
  });

  it('port 0 is an OS-assigned port: the client gets the address at runtime, not from a fixed localhost URL', () => {
    const result = run({
      'tools/check/registry.spec.mjs': "server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}/`));\n",
      'e2e/playwright.config.ts': "const BASE_URL = 'http://localhost:4300';\n",
    });
    expect(result.violations).toEqual([]);
  });

  it('a templated client port resolves through its assignment in the same file', () => {
    const client = "const PORT = Number(process.env['E2E_PORT'] ?? 4010);\nconst BASE_URL = `http://localhost:${PORT}`;\n";
    expect(run({ 'perf/mock-api.js': MOCK_SERVER, 'e2e/playwright.config.ts': client }).violations).toEqual([
      expect.stringMatching(/^perf\/mock-api\.js:4: .*port 4010.*e2e\/playwright\.config\.ts:2 \(http:\/\/localhost:\$\{PORT\}\)/),
    ]);
    const other = client.replace('4010', '4300');
    expect(run({ 'perf/mock-api.js': MOCK_SERVER, 'e2e/playwright.config.ts': other }).violations).toEqual([]);
  });

  it('a pass says how many test/perf files it read, and never "compliance verified" over none', () => {
    const none = run({ 'src/app.ts': 'export const x = 1;\n' });
    expect(none.passed).toBe(true);
    expect(none.judgedNothing).toBeUndefined();
    expect(none.message).toBe('Test Server Loopback Address Match: 0 test/perf files — nothing to compare');
    const noBind = run({ 'tests/api.test.ts': "fetch('http://localhost:4010');\n", 'e2e/run.e2e.ts': '' });
    expect(noBind.message).toBe(
      'Test Server Loopback Address Match: 2 test/perf files read, none binds a server to 127.0.0.1 only — nothing to compare'
    );
    const matched = run({
      'perf/mock-api.js': MOCK_SERVER,
      'src/environments/environment.e2e.ts': TEST_ENV.replace('localhost', '127.0.0.1'),
    });
    expect(matched.message).toBe(
      'Test Server Loopback Address Match: 2 test/perf files read, no server bound to 127.0.0.1 only is called through localhost'
    );
  });

  it('a database host in a test config is not a server bind', () => {
    const result = run({
      'tests/conftest.py': 'engine = connect(host="127.0.0.1", port=5432)\nBASE = "http://localhost:5432"\n',
    });
    expect(result.violations).toEqual([]);
  });

  it('application code outside test and perf files is not read', () => {
    const result = run({
      'src/server.js': MOCK_SERVER,
      'src/config.ts': TEST_ENV,
    });
    expect(result.violations).toEqual([]);
  });
});
