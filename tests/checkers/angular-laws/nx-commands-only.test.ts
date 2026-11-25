/**
 * Nx Commands Only on real project fixtures: the law reads the package.json
 * scripts, the README at the root, nx.json and angular.json.
 */
import { NxCommandsOnlyLaw } from '../../../src/checkers/angular-laws/nx-commands-only';
import { ctx, project } from '../toolkit-fixture';

const pkg = (scripts: Record<string, string>) =>
  JSON.stringify({ name: 'fixture', version: '1.0.0', scripts });

const run = (files: Record<string, string>) =>
  NxCommandsOnlyLaw.check(ctx(project(files)));

const NX_WORKSPACE = {
  'nx.json': JSON.stringify({ npmScope: 'acme' }),
  'package.json': pkg({ start: 'nx serve web', build: 'nx run-many -t build' }),
};

describe('NxCommandsOnlyLaw', () => {
  it('passes an Nx workspace whose scripts and README use nx', () => {
    const result = run({
      ...NX_WORKSPACE,
      'README.md': '# Acme\n\nRun `nx serve web` to start.\n',
    });

    expect(result.violations).toEqual([]);
    expect(result.passed).toBe(true);
  });

  it('reports each script that runs the Angular CLI directly', () => {
    const result = run({
      'nx.json': '{}',
      'package.json': pkg({
        start: 'ng serve',
        lint: 'npm run prep && ng lint',
        test: 'nx test web',
      }),
    });

    expect(result.violations).toEqual([
      'Package script "start" uses Angular CLI directly: ng serve',
      'Package script "lint" uses Angular CLI directly: npm run prep && ng lint',
    ]);
  });

  it('does not report a script that also goes through nx', () => {
    const result = run({
      'nx.json': '{}',
      'package.json': pkg({ ci: 'nx affected -t lint && ng version' }),
    });

    expect(result.violations).toEqual([]);
  });

  it('reports an ng command in the README with its line', () => {
    const result = run({
      ...NX_WORKSPACE,
      'README.md':
        '# Acme\n\nplanning notes\nRun ng build --prod\nOr nx build web\n',
    });

    expect(result.violations).toEqual([
      'Direct ng command in documentation README.md:4: Run ng build --prod',
    ]);
  });

  it('asks for nx.json and reports angular.json without Nx', () => {
    const result = run({
      'package.json': pkg({ start: 'nx serve' }),
      'angular.json': JSON.stringify({ version: 1, projects: {} }),
    });

    expect(result.violations).toEqual([
      'nx.json configuration file missing - Nx workspace required',
      'Using angular.json instead of workspace.json - migrate to Nx workspace',
    ]);
    expect(result.suggestions).toEqual([
      'Replace ng commands with nx commands',
      'Update package.json scripts to use nx',
      'Update documentation to show nx usage',
      'Configure proper Nx workspace',
    ]);
  });

  it('reads a project without package.json scripts', () => {
    const result = run({ 'nx.json': '{}', 'package.json': '{"name":"x"}' });

    expect(result.violations).toEqual([]);
  });
});
