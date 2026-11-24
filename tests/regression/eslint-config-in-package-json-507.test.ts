/**
 * #507 — Professional Excellence Mandate reported `Missing eslint.config.mjs`
 * for a project that keeps its ESLint config where ESLint reads it but the
 * law's fixed file list did not: `eslintConfig` in package.json, an
 * extensionless `.eslintrc`, `eslint.config.mts` / `.cts`.
 *
 * The ESLint concern now takes the files from the same list Zero Tolerance
 * Doctrine uses (one list, so the two laws cannot disagree), and package.json
 * `eslintConfig` (an object). A project with none of them is still told the
 * config is missing.
 */
import { ProfessionalExcellenceLaw } from '../../src/checkers/sacred-laws/professional-excellence';
import { json, useTempProject } from './foreign-json-486.helpers';

const project = useTempProject();
const { write } = project;
const MISSING = 'Missing eslint.config.mjs';
const violations = (): string[] =>
  (ProfessionalExcellenceLaw.check(project.context()).violations ??
    []) as string[];

describe('#507 every ESLint config ESLint reads is an ESLint config', () => {
  it('package.json eslintConfig', () => {
    write('package.json', json({ name: 'x', eslintConfig: { rules: {} } }));
    expect(violations()).not.toContain(MISSING);
  });

  it.each([
    ['.eslintrc', json({ rules: {} })],
    ['eslint.config.mts', 'export default [];\n'],
    ['eslint.config.cts', 'module.exports = [];\n'],
  ])('%s', (file, text) => {
    write('package.json', json({ name: 'x' }));
    write(file, text);
    expect(violations()).not.toContain(MISSING);
  });

  it('none of them: still missing', () => {
    write('package.json', json({ name: 'x' }));
    expect(violations()).toContain(MISSING);
  });

  it('an eslintConfig that is not an object is not a config', () => {
    write('package.json', json({ name: 'x', eslintConfig: 'airbnb' }));
    expect(violations()).toContain(MISSING);
  });
});
