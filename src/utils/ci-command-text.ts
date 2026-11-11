/**
 * The commands in a CI file or a shell hook, without the prose around them.
 *
 * A gate is a command that runs. A `# lighthouse budget — TODO` comment and a
 * step's `name: Performance budget` are text a reader sees and a runner does
 * not execute, so a check that searches CI configuration for a tool's name
 * must not find it there. This removes `#` comments (YAML and shell share the
 * syntax) and `name:` lines before such a search.
 *
 * Line-based, not a YAML parser: a `#` inside a quoted string is treated as a
 * comment when preceded by whitespace. That can hide a command, never invent
 * one — the direction a gate check can afford.
 */
export function commandText(content: string): string {
  return content
    .split(/\r?\n/)
    .map(line => line.replace(/(^|\s)#.*$/, '$1'))
    .filter(line => !/^\s*-?\s*name\s*:/.test(line))
    .join('\n');
}
