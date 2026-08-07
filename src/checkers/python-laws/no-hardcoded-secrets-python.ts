/**
 * No Hardcoded Secrets (Python)
 * A password / API key / token assigned to a string literal in source ends up in
 * version control and every build artefact, and cannot be rotated without a code
 * change. Read secrets from the environment / a secrets manager (a Pydantic
 * BaseSettings) instead. (The TS/JS/JSON/YAML secret scan does not cover .py, so
 * this guards Python sources.)
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { PythonLawBase } from './python-law-base';

export class NoHardcodedSecretsPythonLaw extends PythonLawBase {
  private static readonly LAW_NAME = 'No Hardcoded Secrets (Python)';
  // Any identifier assigned a string literal of >= 8 chars (optionally annotated).
  private static readonly STRING_ASSIGN =
    /^\s*([A-Za-z_]\w*)\s*(?::\s*[\w[\], .|]+)?\s*=\s*(['"])([^'"]{8,})\2/;
  // The identifier names a credential.
  private static readonly SECRET_NAME =
    /(password|passwd|secret|api_?key|apikey|token|access_key|secret_key|private_key|client_secret|auth_token)/i;
  // Names that are not secrets even though they contain a trigger word.
  private static readonly NAME_EXEMPT =
    /(header|url|uri|name|field|prefix|param|env|scheme|type|algorithm|expiry|ttl|id|regex|pattern|key_path|path)$/i;
  // Values that are obviously not real secrets.
  private static readonly VALUE_EXEMPT =
    /change.?me|your[_-]|example|placeholder|x{4,}|<[^>]*>|\$\{|\.\.\.|dummy|fake|sample|redacted|^(none|null|test|secret|password|token|changeit)$|^https?:|^[A-Z][\w-]+\/[\w.+-]+$|\s/i;

  static check(context: LawCheckContext): LawResult {
    const { projectRoot } = context;
    const early = this.createPythonRequiredResult(
      this.LAW_NAME,
      projectRoot,
      root => this.hasPythonProject(root),
      context
    );
    if (early) return early;

    const violations: string[] = [];

    for (const file of this.getPythonFiles(projectRoot, context.config)) {
      if (this.isTestFile(file)) continue; // test fixtures use fake secrets
      const raw = FileUtils.readFileContentSync(file);
      if (!raw) continue;
      // Use RAW lines: the secret lives inside the string literal that
      // stripPython would blank out. Comment-only lines are skipped to avoid FP.
      const lines = this.splitLines(raw);
      const rel = PathOperations.getRelative(projectRoot, file);
      this.collectSecretAssignments(lines, rel, violations);
    }

    return this.createResult(
      violations,
      this.LAW_NAME,
      'PYTHON_LAW',
      [
        'Load secrets from env / a secrets manager via a Pydantic BaseSettings',
        'Keep real values out of source; commit only placeholders in .env.example',
      ],
      context
    );
  }

  /** Flags every credential-named identifier assigned a non-exempt string literal. */
  private static collectSecretAssignments(
    lines: string[],
    rel: string,
    violations: string[]
  ): void {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? '';
      if (line.trimStart().startsWith('#')) continue;
      const m = line.match(this.STRING_ASSIGN);
      if (!m) continue;
      const name = m[1] ?? '';
      const value = m[3] ?? '';
      if (!this.SECRET_NAME.test(name)) continue;
      if (this.NAME_EXEMPT.test(name)) continue;
      if (this.VALUE_EXEMPT.test(value)) continue;
      violations.push(
        `${rel}:${i + 1}: ${name} is assigned a hardcoded secret literal — read it from the environment / a BaseSettings, not source`
      );
    }
  }
}
