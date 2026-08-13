/**
 * Recommended-config generator, behind the `ruleofcode recommend` CLI command.
 *
 * Plain CommonJS with no dependency on dist/, so it runs without a build step.
 */

const fs = require('fs');
const path = require('path');

const OUTPUT_FILE = 'ROC-RECOMMENDED.ruleofcode.config.json';

/** Laws applicable per stack — kept in sync with the registry by a unit test. */
const APPLICABLE_LAWS = { python: 99, frontend: 132, node: 77 };

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
  } catch {
    return null;
  }
}

/** Which recommendation template fits this project (null = do not write one). */
function detectStack(root) {
  const has = rel => fs.existsSync(path.join(root, rel));

  if (has('pyproject.toml') || has('setup.py') || has('requirements.txt')) {
    return { stack: 'python', projectType: 'python' };
  }

  const pkg = readJson(path.join(root, 'package.json'));
  if (!pkg) return null;
  // Never recommend to RoC itself (published under either name).
  if (pkg.name === 'ruleofcode' || pkg.name === '@ruleofcode/core') return null;

  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
  if (has('angular.json') || deps['@angular/core']) {
    return { stack: 'frontend', projectType: 'angular' };
  }
  if (deps.react) return { stack: 'frontend', projectType: 'react' };
  if (deps.vue) return { stack: 'frontend', projectType: 'vue' };
  return null; // generic node/library — no opinionated template yet
}

function projectName(root, fallbackType) {
  const pkg = readJson(path.join(root, 'package.json'));
  if (pkg?.name) return pkg.name;
  const pyproject = path.join(root, 'pyproject.toml');
  if (fs.existsSync(pyproject)) {
    const m = fs
      .readFileSync(pyproject, 'utf8')
      .match(/^\s*name\s*=\s*["']([^"']+)["']/m);
    if (m) return m[1];
  }
  return `${path.basename(root)} (${fallbackType})`;
}

function rocVersion() {
  const pkg = readJson(path.join(__dirname, '..', 'package.json'));
  return pkg?.version ? `v${pkg.version}` : 'v?';
}

/**
 * Render the stack template into the project root.
 * Returns { written, fileName, stack, applicableLaws } — written:false when
 * the stack is unknown or the file is already identical.
 */
function generateRecommendedConfig(root, options = {}) {
  const detected = detectStack(root);
  if (!detected) return { written: false };

  const { stack, projectType } = detected;
  const templateFile = path.join(
    __dirname,
    '..',
    'templates',
    `recommended-${stack}.config.json`
  );
  if (!fs.existsSync(templateFile)) return { written: false };

  const applicableLaws = APPLICABLE_LAWS[stack] ?? 0;
  const rendered = fs
    .readFileSync(templateFile, 'utf8')
    .split('{{PROJECT_NAME}}')
    .join(projectName(root, projectType))
    .split('{{PROJECT_TYPE}}')
    .join(projectType)
    .split('{{ROC_VERSION}}')
    .join(rocVersion())
    .split('{{GENERATED_AT}}')
    .join(options.now ?? new Date().toISOString().slice(0, 10))
    .split('"{{MIN_LAWS}}"')
    .join(String(Math.floor(applicableLaws * 0.9)));

  const target = path.join(root, OUTPUT_FILE);
  // Idempotent: skip the write (and the notice) when nothing changed, so a
  // plain `npm ci` on an unchanged version stays quiet.
  if (fs.existsSync(target) && fs.readFileSync(target, 'utf8') === rendered) {
    return { written: false, fileName: OUTPUT_FILE, stack, applicableLaws };
  }

  fs.writeFileSync(target, rendered);
  return { written: true, fileName: OUTPUT_FILE, stack, applicableLaws };
}

module.exports = {
  OUTPUT_FILE,
  APPLICABLE_LAWS,
  detectStack,
  generateRecommendedConfig,
};
