#!/usr/bin/env node
/**
 * Version sweep (#560): rewrite every hand-written mention of the current
 * version to the version being released — the entries of
 * scripts/current-version-mentions.js marked `sweep: true`, and nothing else.
 *
 *   node scripts/version-sweep.js --to=X.Y.Z --dry-run   # print, write nothing
 *   node scripts/version-sweep.js --to=X.Y.Z             # write
 *
 * Fails (exit 1, nothing written) when a marked place does not match as many
 * times as the table says: the text around it was reworded or removed, and the
 * table must follow before the sweep can be trusted. The entries written by a
 * tool (the demo recording, the hook stamps) are named with the command that
 * writes them and left alone. The release checklist ends the sweep with
 * `npx jest tests/regression/current-version-mentions.test.ts`.
 */
const fs = require('fs');
const path = require('path');

const {
  CURRENT_VERSION_MENTIONS,
  mentionsIn,
} = require('./current-version-mentions');

const ROOT = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const to = argv.find(a => a.startsWith('--to='))?.slice('--to='.length);
  return { to, dryRun: argv.includes('--dry-run') };
}

/** The rewritten files and the lines they change; errors when a place is gone. */
function plan(to, read) {
  const files = new Map();
  const changes = [];
  const errors = [];
  for (const entry of CURRENT_VERSION_MENTIONS) {
    if (!entry.sweep) continue;
    const text = files.get(entry.file) ?? read(entry.file);
    const found = mentionsIn(text, entry.pattern);
    if (found.length !== entry.count) {
      errors.push(
        `${entry.file}: ${entry.pattern} matched ${found.length} time(s), expected ${entry.count}`
      );
      continue;
    }
    let next = text;
    // right to left, so earlier offsets stay valid
    for (const m of [...found].reverse()) {
      if (m.version === to) continue;
      next = next.slice(0, m.start) + to + next.slice(m.end);
      changes.push({ file: entry.file, line: m.line, from: m.version, to });
    }
    files.set(entry.file, next);
  }
  changes.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
  return { files, changes, errors };
}

function main() {
  const { to, dryRun } = parseArgs(process.argv.slice(2));
  if (!to || !/^\d+\.\d+\.\d+$/.test(to)) {
    console.error(
      'usage: node scripts/version-sweep.js --to=X.Y.Z [--dry-run]'
    );
    process.exit(2);
  }
  const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
  const { files, changes, errors } = plan(to, read);
  if (errors.length > 0) {
    for (const e of errors) console.error(`✗ ${e}`);
    console.error(
      'Nothing written. Update scripts/current-version-mentions.js first.'
    );
    process.exit(1);
  }
  for (const c of changes)
    console.log(`${c.file}:${c.line}  ${c.from} → ${c.to}`);
  console.log(
    `${changes.length} mention(s) in ${new Set(changes.map(c => c.file)).size} file(s)${dryRun ? ' — dry run, nothing written' : ''}`
  );
  if (!dryRun)
    for (const [file, text] of files)
      if (text !== read(file)) fs.writeFileSync(path.join(ROOT, file), text);
  const byTool = new Map();
  for (const entry of CURRENT_VERSION_MENTIONS)
    if (!entry.sweep)
      byTool.set(entry.producedBy, [
        ...(byTool.get(entry.producedBy) ?? []),
        entry.file,
      ]);
  console.log('\nNot rewritten here — written by a tool:');
  for (const [tool, list] of byTool)
    console.log(`  ${[...new Set(list)].join(', ')}: ${tool}`);
}

if (require.main === module) main();

module.exports = { plan };
