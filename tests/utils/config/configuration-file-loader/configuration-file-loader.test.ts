/**
 * ConfigurationFileLoader on real files and environment variables: the four
 * sources src/config/loader.ts reads RoC's configuration from.
 */
import { ConfigurationFileLoader as Loader } from '../../../../src/utils/config/configuration-file-loader/configuration-file-loader';
import { project } from '../../../checkers/toolkit-fixture';

describe('ConfigurationFileLoader.loadFromConfigFile', () => {
  it('reads ruleofcode.config.json at the root', () => {
    const root = project({
      'ruleofcode.config.json': JSON.stringify({ laws: { paretoMode: false } }),
    });

    expect(Loader.loadFromConfigFile(root)).toEqual({
      laws: { paretoMode: false },
    });
  });

  it('reads a config in config/ when the root has none', () => {
    const root = project({
      'config/roc.config.json': JSON.stringify({ project: { name: 'sub' } }),
    });

    expect(Loader.loadFromConfigFile(root)).toEqual({
      project: { name: 'sub' },
    });
  });

  it('prefers ruleofcode.config.js over ruleofcode.config.json', () => {
    const root = project({
      'ruleofcode.config.js': "module.exports = { project: { name: 'js' } };\n",
      'ruleofcode.config.json': JSON.stringify({ project: { name: 'json' } }),
    });

    expect(Loader.loadFromConfigFile(root)).toEqual({
      project: { name: 'js' },
    });
  });

  it('reads .ruleofcoderc as JSON, or as JavaScript when it is not JSON', () => {
    const asJson = project({ '.ruleofcoderc': '{"project":{"name":"rc"}}' });
    const asJs = project({
      '.ruleofcoderc': "module.exports = { project: { name: 'rc-js' } };\n",
    });

    expect(Loader.loadFromConfigFile(asJson)).toEqual({
      project: { name: 'rc' },
    });
    expect(Loader.loadFromConfigFile(asJs)).toEqual({
      project: { name: 'rc-js' },
    });
  });

  it('skips a config that does not parse and reads the next one', () => {
    const root = project({
      'ruleofcode.config.json': '{ "laws": ',
      '.ruleofcoderc.json': JSON.stringify({ project: { name: 'next' } }),
    });

    expect(Loader.loadFromConfigFile(root)).toEqual({
      project: { name: 'next' },
    });
  });

  it('is null when there is no config file', () => {
    expect(Loader.loadFromConfigFile(project({ 'README.md': '' }))).toBeNull();
  });
});

describe('ConfigurationFileLoader.loadFromExplicitPath (--config)', () => {
  it('reads the named file', () => {
    const root = project({
      'ci/roc.json': JSON.stringify({ reporting: { format: 'json' } }),
    });

    expect(Loader.loadFromExplicitPath(root, 'ci/roc.json')).toEqual({
      reporting: { format: 'json' },
    });
  });

  it('is an empty config for a file that holds null', () => {
    const root = project({ 'ci/roc.json': 'null' });

    expect(Loader.loadFromExplicitPath(root, 'ci/roc.json')).toEqual({});
  });

  it('throws for a file that does not exist, naming it', () => {
    const root = project({ 'README.md': '' });

    expect(() => Loader.loadFromExplicitPath(root, 'ci/missing.json')).toThrow(
      /^Config file not found: .*ci[\/]missing\.json \(from --config\)$/
    );
  });

  it('throws for a file that does not parse, never falling back', () => {
    const root = project({ 'ci/roc.json': '{ "laws": ' });

    expect(() => Loader.loadFromExplicitPath(root, 'ci/roc.json')).toThrow(
      /could not be parsed/
    );
  });
});

describe('ConfigurationFileLoader.loadFromPackageJson', () => {
  it('reads the "ruleofcode" key, then the "roc" key', () => {
    const both = project({
      'package.json': JSON.stringify({
        roc: { project: { name: 'roc' } },
        ruleofcode: { project: { name: 'ruleofcode' } },
      }),
    });
    const rocOnly = project({
      'package.json': JSON.stringify({ roc: { project: { name: 'roc' } } }),
    });

    expect(Loader.loadFromPackageJson(both)).toEqual({
      project: { name: 'ruleofcode' },
    });
    expect(Loader.loadFromPackageJson(rocOnly)).toEqual({
      project: { name: 'roc' },
    });
  });

  it('is null without the keys, without package.json, or with broken JSON', () => {
    expect(
      Loader.loadFromPackageJson(project({ 'package.json': '{"name":"x"}' }))
    ).toBeNull();
    expect(Loader.loadFromPackageJson(project({ 'README.md': '' }))).toBeNull();
    expect(
      Loader.loadFromPackageJson(project({ 'package.json': '{ "name": ' }))
    ).toBeNull();
  });
});

describe('ConfigurationFileLoader.loadFromEnvironment', () => {
  const OURS = /^(ROC_|RULEOFCODE_)/;
  let saved: Record<string, string | undefined>;

  beforeEach(() => {
    saved = {};
    for (const key of Object.keys(process.env)) {
      if (OURS.test(key)) {
        saved[key] = process.env[key];
        delete process.env[key];
      }
    }
  });
  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      if (OURS.test(key)) delete process.env[key];
    }
    Object.assign(process.env, saved);
  });

  it('is null when no ROC_ or RULEOFCODE_ variable is set', () => {
    expect(Loader.loadFromEnvironment()).toBeNull();
  });

  it('turns prefixed variables into nested keys with typed values', () => {
    process.env.ROC_REPORTING_VERBOSE = 'true';
    process.env.ROC_HOOKS_PREPUSH = 'false';
    process.env.RULEOFCODE_PERFORMANCE_MAXCONCURRENT = '4';
    process.env.ROC_PROJECT_NAME = 'demo';
    process.env.ROC_EMPTY = '';

    expect(Loader.loadFromEnvironment()).toEqual({
      reporting: { verbose: true },
      hooks: { prepush: false },
      performance: { maxconcurrent: 4 },
      project: { name: 'demo' },
    });
  });
});
