#!/usr/bin/env node
/**
 * Post-install: drop the stack-appropriate RECOMMENDED config into the
 * consumer's project root, so every RoC upgrade delivers the current
 * maintainer recommendation next to the project's own config.
 *
 * Contract:
 *  - Writes ONLY `ROC-RECOMMENDED.ruleofcode.config.json` — never touches the
 *    project's active `ruleofcode.config.json` (the name is deliberately not
 *    one RoC auto-discovers).
 *  - Never fails an install: every error is swallowed, exit code is always 0.
 *  - Skips silently when it cannot identify a consumer root, when the consumer
 *    IS RoC itself, or when the file is already up to date.
 *
 * Also runnable by hand: `node scripts/postinstall-recommend.js [projectRoot]`
 * (the `ruleofcode recommend` CLI command uses the same generator).
 */

const path = require('path');
const { generateRecommendedConfig } = require('./recommend-config');

function consumerRoot() {
  // npm sets INIT_CWD to the directory where the install was invoked.
  const fromArg = process.argv[2];
  if (fromArg) return path.resolve(fromArg);
  const initCwd = process.env.INIT_CWD;
  if (!initCwd) return null;
  const resolved = path.resolve(initCwd);
  // Installing inside RoC itself (or into node_modules) — nothing to do.
  if (resolved.split(path.sep).includes('node_modules')) return null;
  return resolved;
}

function main() {
  try {
    const root = consumerRoot();
    if (!root) return;

    const result = generateRecommendedConfig(root);
    if (!result.written) return; // unknown stack / RoC itself / unchanged

    console.log(
      `\n🏛️  RuleOfCode: wrote ${result.fileName} (${result.stack} stack, ${result.applicableLaws} applicable laws).`
    );
    console.log(
      `   It is a REFERENCE, not your active config — run it with:  npx ruleofcode audit --config ${result.fileName}`
    );
  } catch {
    // An install must never break because of a recommendation file.
  }
}

main();
