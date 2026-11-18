/**
 * What selects each edge / deploy-security law: the files that hold its
 * subject, as `requires.anyFileContaining` entries. A project without the
 * subject — no proxy that builds a URL, no wrangler configuration, no
 * hosting rewrite to a service — does not select the law, so it is neither
 * counted nor passed. Each law reads exactly these files (gate-files).
 */

import type { LawRequirement } from '../../types/enhanced-law.types';
import { TEST_TREES } from './gate-files';

const JS_TEST_FILES = ['**/*.d.ts', '**/*.{spec,test}.*', '**/*.stories.*', '**/*.min.js'];
const PY_TEST_FILES = ['**/test_*.py', '**/*_test.py', '**/conftest.py'];

/**
 * A JS/TS file that calls `new URL(x, base)` (a second argument on the
 * line; one level of nested parentheses in the first) and holds an HTTP call
 * the URL could reach. `(?<![\s\S])` anchors both lookaheads at the start
 * of the file. A comment line, or a `new URL(` inside an open quote on its
 * line (prose in a string), selects nothing: only closed '…' / "…" strings
 * may stand before it.
 */
const URL_WITH_BASE = String.raw`^(?![ \t]*(?:\*|//))(?:[^\n'"` + '`' + String.raw`]|'[^'\n]*'|"[^"\n]*")*?\bnew\s+URL\s*\((?:[^(),;\n]|\((?:[^()\n]|\([^()\n]*\))*\))+,`;
const HTTP_CALL = String.raw`\b(?:fetch|axios|got|ky)\s*[.(]|\bnew\s+Request\s*\(|\bhttps?\.(?:request|get)\s*\(|\bundici\b`;

export const REQUIRES_PROXY_UPSTREAM_URL: LawRequirement = {
  anyFileContaining: [
    {
      files: ['**/*.{ts,mts,cts,js,mjs,cjs}'],
      pattern: String.raw`(?<![\s\S])(?=[\s\S]*?(?:${HTTP_CALL}))(?=[\s\S]*?${URL_WITH_BASE})`,
      exclude: [...TEST_TREES, ...JS_TEST_FILES],
    },
    { files: ['**/*.py'], pattern: String.raw`\burljoin\s*\(`, exclude: [...TEST_TREES, ...PY_TEST_FILES] },
  ],
};
