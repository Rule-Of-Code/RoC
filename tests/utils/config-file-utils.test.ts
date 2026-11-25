/**
 * ConfigFileUtils on real files: getDefaultConfig reads RoC's config from the
 * working directory, readPackageJson reads a project's package.json.
 */
import { ConfigFileUtils } from '../../src/utils/config-file-utils';
import { project } from '../checkers/toolkit-fixture';

/** Run `fn` with `dir` as the working directory, and restore it. */
const inDir = <T>(dir: string, fn: () => T): T => {
  const before = process.cwd();
  process.chdir(dir);
  try {
    return fn();
  } finally {
    process.chdir(before);
  }
};

describe('ConfigFileUtils.getDefaultConfig', () => {
  it('reads ruleofcode.config.json from the working directory', () => {
    const config = { laws: { severity: { 'Commit Size Control': 'error' } } };
    const root = project({ 'ruleofcode.config.json': JSON.stringify(config) });

    expect(inDir(root, () => ConfigFileUtils.getDefaultConfig())).toEqual(
      config
    );
  });

  it('reads .ruleofcoderc.json when there is no ruleofcode.config.json', () => {
    const config = { ignores: { global: ['tmp/**'] } };
    const root = project({ '.ruleofcoderc.json': JSON.stringify(config) });

    expect(inDir(root, () => ConfigFileUtils.getDefaultConfig())).toEqual(
      config
    );
  });

  it('is the minimal default when the working directory has no config', () => {
    const root = project({ 'README.md': '# x\n' });

    expect(inDir(root, () => ConfigFileUtils.getDefaultConfig())).toEqual(
      ConfigFileUtils.getMinimalDefaultConfig()
    );
  });

  it('is the minimal default when the config is not valid JSON', () => {
    const root = project({ 'ruleofcode.config.json': '{ "laws": ' });

    expect(inDir(root, () => ConfigFileUtils.getDefaultConfig())).toEqual(
      ConfigFileUtils.getMinimalDefaultConfig()
    );
  });
});

describe('ConfigFileUtils.readPackageJson', () => {
  it('reads package.json', () => {
    const root = project({
      'package.json': JSON.stringify({ name: 'x', scripts: { test: 'jest' } }),
    });

    expect(ConfigFileUtils.readPackageJson(root)).toEqual({
      name: 'x',
      scripts: { test: 'jest' },
    });
  });

  it('returns the given default when there is no package.json', () => {
    const root = project({ 'README.md': '# x\n' });

    expect(ConfigFileUtils.readPackageJson(root, { name: 'none' })).toEqual({
      name: 'none',
    });
    expect(ConfigFileUtils.readPackageJson(root)).toEqual({});
  });

  it('returns the given default when package.json is not valid JSON', () => {
    const root = project({ 'package.json': '{ "name": ' });

    expect(ConfigFileUtils.readPackageJson(root, { name: 'none' })).toEqual({
      name: 'none',
    });
  });
});
