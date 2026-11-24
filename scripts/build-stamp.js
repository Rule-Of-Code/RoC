#!/usr/bin/env node
/**
 * Build stamp: what dist/ was built from (#586).
 *
 * Tests that run dist/cli.js checked only that the file exists, so in a
 * worktree where a branch was merged or checked out without a rebuild they ran
 * the old code: a correct change failed, or a broken src/ passed. `npm run
 * build` now writes dist/.build-stamp.json with a hash of the build inputs
 * (every file under src/ and tsconfig.json, by content), and the tests compare
 * it before they run the CLI (tests/helpers/built-cli.ts).
 *
 * By content, not by modification time: a checkout or a merge changes mtimes
 * without changing what was built. Line endings are read as LF, so a checkout
 * that only converts them does not count as a change either.
 *
 * Usage: node scripts/build-stamp.js   # after tsc, in `npm run build`
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const STAMP_FILE = path.join('dist', '.build-stamp.json');

/** Every file under `dir`, as POSIX paths relative to `root`, sorted. */
function filesUnder(root, dir) {
  const out = [];
  const walk = rel => {
    for (const entry of fs.readdirSync(path.join(root, rel), {
      withFileTypes: true,
    })) {
      const child = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(child);
      else if (entry.isFile()) out.push(child);
    }
  };
  if (fs.existsSync(path.join(root, dir))) walk(dir);
  return out.sort();
}

/** sha256 over the names and contents (CRLF read as LF) of the build inputs under `root`. */
function buildInputsHash(root) {
  const hash = crypto.createHash('sha256');
  const inputs = [...filesUnder(root, 'src'), 'tsconfig.json'].filter(file =>
    fs.existsSync(path.join(root, file))
  );
  for (const file of inputs) {
    const text = fs
      .readFileSync(path.join(root, file))
      .toString('latin1')
      .replace(/\r\n/g, '\n');
    hash.update(`${file}\0${text.length}\0`);
    hash.update(text, 'latin1');
  }
  return { hash: hash.digest('hex'), files: inputs.length };
}

/** Write dist/.build-stamp.json for the inputs under `root`. */
function writeStamp(root) {
  const stamp = buildInputsHash(root);
  fs.writeFileSync(
    path.join(root, STAMP_FILE),
    `${JSON.stringify(stamp, null, 2)}\n`
  );
  return stamp;
}

/**
 * Why dist/ under `root` is not what src/ would build, or null when it is.
 * Never rebuilds: a test that rebuilt would hide the problem and make every
 * run slower.
 */
function staleBuildReason(root) {
  if (!fs.existsSync(path.join(root, 'dist', 'cli.js'))) {
    return 'dist/cli.js missing — run npm run build';
  }
  let stamp;
  try {
    stamp = JSON.parse(fs.readFileSync(path.join(root, STAMP_FILE), 'utf8'));
  } catch {
    return 'dist/ has no build stamp — run npm run build';
  }
  return stamp.hash === buildInputsHash(root).hash
    ? null
    : 'dist/ was built from a different src/ — run npm run build';
}

module.exports = { STAMP_FILE, buildInputsHash, writeStamp, staleBuildReason };

if (require.main === module) {
  const root = path.resolve(__dirname, '..');
  const stamp = writeStamp(root);
  console.log(
    `build stamp: ${stamp.files} files, ${stamp.hash.slice(0, 12)} → ${STAMP_FILE}`
  );
}
