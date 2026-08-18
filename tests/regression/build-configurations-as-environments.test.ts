import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { BuildEnvironmentAnalyzerValidation } from '../../src/utils/deployment/build-environment-analyzer/build-environment-analyzer-validation';

/**
 * An Angular or Nx workspace states its environments in the BUILD SYSTEM, not
 * in the process environment. `configurations.production` and
 * `configurations.development` are what select the production budgets, output
 * hashing and optimisation.
 *
 * That is environment-specific configuration — the very thing this law's own
 * advice asks for — so a project that already had it was told to "use
 * environment-specific config files" and could not make the finding move by
 * doing so. Adding `NODE_ENV` to satisfy it would add a variable nothing reads:
 * ceremony rather than parity, which is the box-ticking this tool exists to
 * refuse.
 */
describe('build configurations are environment configuration', () => {
  let root: string;

  const write = (rel: string, content: string): void => {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  };

  const detected = (): boolean =>
    BuildEnvironmentAnalyzerValidation.validateEnvironmentDetection(root)
      .hasEnvironmentDetection;

  const projectJson = (configurations: Record<string, unknown>): string =>
    JSON.stringify({
      name: 'web',
      targets: {
        build: {
          executor: '@angular/build:application',
          defaultConfiguration: 'production',
          configurations,
        },
      },
    });

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-env-'));
    write('package.json', '{"name":"w","version":"1.0.0"}');
  });
  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('accepts an Nx target with production and development', () => {
    write('nx.json', '{}');
    write(
      'apps/web/project.json',
      projectJson({
        production: { budgets: [{ type: 'initial', maximumError: '1mb' }] },
        development: { optimization: false, sourceMap: true },
      })
    );

    expect(detected()).toBe(true);
  });

  it('accepts the same declaration in a root angular.json', () => {
    write(
      'angular.json',
      JSON.stringify({
        projects: {
          web: {
            architect: {
              build: {
                configurations: { production: {}, development: {} },
              },
            },
          },
        },
      })
    );

    expect(detected()).toBe(true);
  });

  it('accepts configurations declared on serve rather than build', () => {
    write('nx.json', '{}');
    write(
      'apps/web/project.json',
      JSON.stringify({
        name: 'web',
        targets: {
          serve: { configurations: { production: {}, development: {} } },
        },
      })
    );

    expect(detected()).toBe(true);
  });

  /**
   * The red control, and the reporter's own boundary: one configuration is a
   * single-environment build, and the finding is fair there.
   */
  it('still reports a target with only one configuration', () => {
    write('nx.json', '{}');
    write('apps/web/project.json', projectJson({ production: { budgets: [] } }));

    expect(detected()).toBe(false);
  });

  it('still reports a project with no environment signal at all', () => {
    write('src/main.ts', 'console.log("hello");');

    expect(detected()).toBe(false);
  });

  it('is not fooled by an empty configurations block', () => {
    write('nx.json', '{}');
    write('apps/web/project.json', projectJson({}));

    expect(detected()).toBe(false);
  });

  /** A file that will not parse is not evidence either way. */
  it('does not treat an unparseable project.json as a declaration', () => {
    write('nx.json', '{}');
    write('apps/web/project.json', '{ this is not json');

    expect(detected()).toBe(false);
  });

  it('still accepts NODE_ENV, so nothing that passed before now fails', () => {
    write('src/main.ts', 'const mode = process.env.NODE_ENV;\n');

    expect(detected()).toBe(true);
  });
});