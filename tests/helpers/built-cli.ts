/**
 * The built CLI, refused when dist/ is not what src/ builds (#586).
 *
 * Tests that run dist/cli.js used to check only that the file exists. Now they
 * take the path from `builtCli()`, which compares the build stamp
 * `npm run build` writes with the current build inputs and throws
 * `dist/ was built from a different src/ — run npm run build` when they
 * differ. It never builds: that would hide the problem and slow every run.
 *
 * A test that takes `ROC_CLI` (another build, such as an installed tarball)
 * does not call it for that build: it is not this tree's dist/.
 */
import path from 'path';

const REPO = path.resolve(__dirname, '..', '..');

interface BuildStamp {
  staleBuildReason: (root: string) => string | null;
}
// eslint-disable-next-line @typescript-eslint/no-var-requires
const stamp = require('../../scripts/build-stamp') as BuildStamp;

/** dist/cli.js of `root` (this tree), or throws why it is not the build of src/. */
export function builtCli(root: string = REPO): string {
  const reason = stamp.staleBuildReason(root);
  if (reason) throw new Error(reason);
  return path.join(root, 'dist', 'cli.js');
}
