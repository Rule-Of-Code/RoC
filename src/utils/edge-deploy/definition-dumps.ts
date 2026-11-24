/**
 * Commands that print a cloud job / scheduler definition with its secret
 * values, and where their output goes.
 *
 * A registry, each entry checked against the tool's reference:
 *   - gcloud scheduler jobs describe — prints the whole job in the default
 *     (YAML) format; an HTTP job's `httpTarget.headers` is a map of "HTTP
 *     request headers … field names and values".
 *   - gcloud scheduler jobs list — its default format is a table without the
 *     headers; with --format=json|yaml it prints every job whole.
 *   - gcloud run jobs describe, gcloud functions describe — the whole
 *     resource, environment variables included, in the default format.
 *   - aws events list-targets-by-rule — JSON by default (the AWS CLI's default
 *     output); targets carry HttpParameters.HeaderParameters.
 *   - az functionapp config appsettings list — every app setting with its
 *     value in plain text (az redacts values only in set/delete results).
 * A projection (gcloud --format=value(…)/table(…)/json(…), --query) that
 * does not name headers, environment or values prints only what it names.
 *
 * A dump is captured when its output goes to a file (`>`, `>>`, `tee`,
 * Out-File, Set-Content, Add-Content, Tee-Object) or, in a CI pipeline file,
 * into the job log. It is masked by a stage that deletes the headers (`jq`
 * / `yq` with `del(`), a `sed` that rewrites header or secret values, a
 * command whose name says mask / redact / scrub / sanitize — in the
 * pipeline, or run later in the file on the file it wrote.
 */

import { commandsInText } from '../deployment/deploy-commands';

/** How far past a command's name its argument is looked for. */
const ARGUMENT_LOOKAHEAD = 400;

export interface DumpVerdict {
  line: number;
  command: string;
  verdict: 'masked' | 'not-captured' | 'not-full' | 'unread' | 'leaks';
  /** Where the output goes, or why it is not judged. */
  detail: string;
}

interface DumpCommand {
  label: string;
  words: string[];
  /** Does the command, with these arguments, print the whole definition? */
  full: (text: string) => boolean;
}

const SECRET_FIELDS = /header|httptarget|env|value|secret|token/i;
const MASK_NAME = /mask|redact|scrub|saniti[sz]/i;
const CI_FILE =
  /(?:^|\/)(?:\.github\/workflows\/[^/]+|\.gitlab-ci\.ya?ml|bitbucket-pipelines\.ya?ml|azure-pipelines\.ya?ml|\.circleci\/config\.ya?ml|cloudbuild[^/]*\.ya?ml)$/;

const flag = (text: string, name: string): string | null => {
  const match = new RegExp(
    String.raw`(?:^|\s)${name}(?:=|\s+)("[^"]*"|'[^']*'|\S+)`
  ).exec(text);
  return match ? (match[1] ?? '').replace(/^["']|["']$/g, '') : null;
};

/** gcloud: the default format decides when --format is absent; a projection prints only what it names. */
const gcloudFull =
  (defaultFull: boolean) =>
  (text: string): boolean => {
    const format = flag(text, '--format');
    if (format === null) return defaultFull;
    if (/^(?:json|yaml)$/i.test(format)) return true;
    const fields = /\((.*)\)/.exec(format)?.[1];
    return fields !== undefined && SECRET_FIELDS.test(fields);
  };

/** aws / az: everything unless --query projects away from the secret fields. */
const queryFull = (text: string): boolean => {
  const query = flag(text, '--query');
  return query === null || SECRET_FIELDS.test(query);
};

const GCLOUD = ['gcloud', '(?:alpha|beta)?'];

export const DUMP_COMMANDS: DumpCommand[] = [
  {
    label: 'gcloud scheduler jobs describe',
    words: [...GCLOUD, 'scheduler', 'jobs', 'describe'],
    full: gcloudFull(true),
  },
  {
    label: 'gcloud scheduler jobs list',
    words: [...GCLOUD, 'scheduler', 'jobs', 'list'],
    full: gcloudFull(false),
  },
  {
    label: 'gcloud run jobs describe',
    words: [...GCLOUD, 'run', 'jobs', 'describe'],
    full: gcloudFull(true),
  },
  {
    label: 'gcloud functions describe',
    words: [...GCLOUD, 'functions', 'describe'],
    full: gcloudFull(true),
  },
  {
    label: 'aws events list-targets-by-rule',
    words: ['aws', 'events', 'list-targets-by-rule'],
    full: queryFull,
  },
  {
    label: 'az functionapp config appsettings list',
    words: ['az', 'functionapp', 'config', 'appsettings', 'list'],
    full: queryFull,
  },
];

/** The words joined by a separator; an optional word (`(?:alpha|beta)?`) may be absent. */
export function commandPattern(
  words: readonly string[],
  separator: string
): string {
  return (
    words
      .map((word, i) =>
        i === 0
          ? word
          : word.endsWith('?')
            ? `(?:${separator}${word.slice(0, -1)})?`
            : `${separator}${word}`
      )
      .join('') + String.raw`\b`
  );
}

/** Shell separator between words, and the Python list form `"a", "b"`. */
export const SHELL_GAP = String.raw`[ \t]+`;
export const PY_GAP = String.raw`(?:[ \t]+|["'][ \t]*,[ \t]*\r?\n?[ \t]*["'])`;

// ── shell ───────────────────────────────────────────────────────────────

const stripComment = (line: string): string => line.replace(/(^|\s)#.*$/, '$1');

/** The command's whole logical line, from its first word: continuation lines joined. */
function logicalLine(lines: string[], index: number, start: RegExp): string {
  let text = stripComment(lines[index] ?? '');
  for (
    let next = index + 1;
    /[\\`]\s*$/.test(text) && next < lines.length;
    next++
  )
    text = `${text.replace(/[\\`]\s*$/, '')} ${stripComment(lines[next] ?? '').trim()}`;
  const at = start.exec(text)?.index ?? 0;
  return text.slice(at);
}

/** The text before the command on its line (to see a `$(` capture). */
const before = (lines: string[], index: number, start: RegExp): string => {
  const line = lines[index] ?? '';
  return line.slice(0, start.exec(line)?.index ?? 0);
};

/** Pipeline stages of a logical line, up to the first `&&`, `||` or `;` outside quotes. */
export function pipelineStages(text: string): string[] {
  const stages: string[] = [];
  let quote: string | null = null;
  let current = '';
  for (let i = 0; i < text.length; i++) {
    const c = text[i] ?? '';
    const next = text[i + 1] ?? '';
    if (quote) {
      if (c === quote) quote = null;
    } else if (c === '"' || c === "'") {
      quote = c;
    } else if (
      c === ';' ||
      (c === '&' && next === '&') ||
      (c === '|' && next === '|')
    ) {
      break;
    } else if (c === '|') {
      stages.push(current.trim());
      current = '';
      continue;
    }
    current += c;
  }
  return [...stages, current.trim()].filter(stage => stage !== '');
}

const REDIRECT =
  /(?:^|[^<>&\d])(?:\d|&)?>>?\s*(?!&|\/dev\/null\b|\$null\b|nul\b)("[^"]+"|'[^']+'|[^\s;|&]+)/i;
const POWERSHELL_WRITE =
  /^(?:Out-File|Set-Content|Add-Content|Tee-Object)\b(?:\s+(?:-(?:FilePath|Path|LiteralPath)\s+)?("[^"]+"|'[^']+'|\S+))?/i;

/** The file a pipeline writes to, or null. */
function fileTarget(stages: string[]): string | null {
  for (const stage of stages) {
    const redirect = REDIRECT.exec(stage);
    if (redirect) return redirect[1] ?? '';
    const tee = /^tee\b(?:\s+-a)?\s+("[^"]+"|'[^']+'|\S+)/.exec(stage);
    if (tee) return tee[1] ?? '';
    const ps = POWERSHELL_WRITE.exec(stage);
    if (ps) return ps[1] ?? 'a file';
  }
  return null;
}

/** A pipeline stage that masks: 'mask', 'projection' (a jq/yq filter not read), or null. */
function maskingStage(stage: string): 'mask' | 'projection' | null {
  const program = stage.split(/\s+/)[0] ?? '';
  if (MASK_NAME.test(program)) return 'mask';
  if (
    program === 'sed' &&
    /header|authorization|secret|token|value|key/i.test(stage)
  )
    return 'mask';
  if (program !== 'jq' && program !== 'yq') return null;
  if (/del\s*\(/.test(stage) && SECRET_FIELDS.test(stage)) return 'mask';
  const filter = stage
    .replace(/^(?:jq|yq)\s+/, '')
    .replace(/(?:^|\s)-[a-zA-Z]+\b/g, ' ')
    .trim()
    .replace(/^["']|["']$/g, '');
  return /^(?:\.|\.\[\])?$/.test(filter.trim()) ? null : 'projection';
}

/** Is a written file masked later in the script (a mask/redact helper run on it)? */
function maskedLater(lines: string[], index: number, target: string): boolean {
  const name = target.replace(/^["']|["']$/g, '');
  return lines
    .slice(index + 1)
    .some(line => MASK_NAME.test(line) && line.includes(name));
}

function judgeShell(
  rel: string,
  lines: string[],
  index: number,
  command: DumpCommand,
  start: RegExp
): DumpVerdict {
  const text = logicalLine(lines, index, start);
  const base = { line: index + 1, command: command.label };
  if (!command.full(text))
    return {
      ...base,
      verdict: 'not-full',
      detail: 'a projection or format without the secret fields',
    };
  if (/\$\([^)]*$|`[^`]*$/.test(before(lines, index, start)))
    return {
      ...base,
      verdict: 'unread',
      detail: 'its output is captured into a variable, which is not followed',
    };
  const stages = pipelineStages(text);
  const masks = stages.slice(1).map(maskingStage);
  if (masks.includes('mask'))
    return { ...base, verdict: 'masked', detail: 'masked in the pipeline' };
  if (masks.includes('projection'))
    return {
      ...base,
      verdict: 'unread',
      detail: 'a jq/yq filter whose output is not evaluated',
    };
  const target = fileTarget(stages);
  if (target !== null) {
    if (maskedLater(lines, index, target))
      return {
        ...base,
        verdict: 'masked',
        detail: `${target}, masked later in the file`,
      };
    return { ...base, verdict: 'leaks', detail: `written to ${target}` };
  }
  if (CI_FILE.test(rel) && stages.length === 1)
    return { ...base, verdict: 'leaks', detail: 'printed into the CI job log' };
  return {
    ...base,
    verdict: 'not-captured',
    detail: 'printed to the terminal',
  };
}

/** Every dump command in a shell script, Makefile or CI YAML file. */
export function shellDumps(rel: string, text: string): DumpVerdict[] {
  const lines = text.split(/\r?\n/);
  // A condition keyword (`if gcloud …`) is a command position too; blanked
  // to spaces of the same length, so lines and columns are unchanged.
  const positioned = text.replace(
    /(^[ \t]*|[;&|][ \t]*)(if|elif|while|until|!)(\s+)(?=(?:gcloud|aws|az)\b)/gm,
    (_m, lead: string, word: string, gap: string) =>
      `${lead}${' '.repeat(word.length)}${gap}`
  );
  return DUMP_COMMANDS.flatMap(command => {
    const start = new RegExp(commandPattern(command.words, String.raw`\s+`));
    return commandsInText(positioned, start).map(found =>
      judgeShell(rel, lines, found.line - 1, command, start)
    );
  });
}

// ── Python ──────────────────────────────────────────────────────────────

const PY_WRITES =
  /\bopen\s*\([^)]*["'][wax]b?\+?["']|\.write_text\s*\(|\.write_bytes\s*\(|\bstdout\s*=\s*(?!subprocess\.)[A-Za-z_]/;
const PY_MASKS =
  /mask|redact|scrub|saniti[sz]|\bdel\s+[^\n]*\[\s*["']headers["']\s*\]|\.pop\(\s*["']headers["']/i;

/** Every dump command a Python file runs (a string or list argument), judged against the file's writes. */
export function pythonDumps(text: string): DumpVerdict[] {
  const writes = PY_WRITES.test(text);
  const masked = PY_MASKS.test(text);
  return DUMP_COMMANDS.flatMap(command =>
    [
      ...text.matchAll(
        new RegExp(`["']${commandPattern(command.words, PY_GAP)}`, 'g')
      ),
    ].map(match => {
      const at = match.index ?? 0;
      const rest = text.slice(at, at + ARGUMENT_LOOKAHEAD);
      const argument = rest
        .slice(0, Math.max(1, rest.search(/[\])]/)))
        .replace(/["',]/g, ' ');
      const base = {
        line: text.slice(0, at).split('\n').length,
        command: command.label,
      };
      if (!command.full(argument))
        return {
          ...base,
          verdict: 'not-full' as const,
          detail: 'a projection or format without the secret fields',
        };
      if (masked)
        return {
          ...base,
          verdict: 'masked' as const,
          detail: 'the file masks or deletes the headers',
        };
      if (!writes)
        return {
          ...base,
          verdict: 'not-captured' as const,
          detail: 'the file writes no file',
        };
      return {
        ...base,
        verdict: 'leaks' as const,
        detail: 'run by a script that writes files',
      };
    })
  );
}
