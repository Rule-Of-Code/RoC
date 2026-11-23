/**
 * The module-scope `let` / `var` bindings of a test file that its tests
 * share (#552). One definition for Test Data Management and Test Isolation
 * Enforcement, so the two laws cannot disagree about the same declaration.
 *
 * A binding is shared when it is declared at column 0 with an initialiser —
 * typed or not — and no `beforeEach` / `afterEach` of the file assigns it a
 * fresh value. Re-creating the value in a hook that runs around every test
 * is the isolation pattern both laws ask for; a type annotation does not
 * decide whether a declaration is shared state. A binding declared without
 * an initialiser (`let logger: Logger;`) is the same pattern spelled the
 * other way and is not shared by declaration.
 *
 * Indented declarations are not read: by construction they are inside a
 * describe, a test or a helper.
 */
export class ModuleBindings {
  /** A column-0 `let` with an initialiser; group 1 is the name. */
  static readonly MODULE_LET =
    /^let\s+([A-Za-z_$][\w$]*)(?:\s*:\s*[^=;\n]+)?\s*=(?![=>])/m;

  /** A column-0 `var` with an initialiser; group 1 is the name. */
  static readonly MODULE_VAR =
    /^var\s+([A-Za-z_$][\w$]*)(?:\s*:\s*[^=;\n]+)?\s*=(?![=>])/m;

  /** A hook that runs around every test. */
  private static readonly RESET_HOOK = /\b(?:beforeEach|afterEach)\s*\(/g;

  /** Whether the code (comments already stripped) has a shared binding. */
  static hasShared(code: string): boolean {
    return this.shared(code).length > 0;
  }

  /** The names of the shared bindings, in order of declaration. */
  static shared(code: string): string[] {
    const declared = [this.MODULE_LET, this.MODULE_VAR].flatMap(pattern =>
      [...code.matchAll(new RegExp(pattern.source, 'gm'))].map(
        match => match[1] ?? ''
      )
    );
    if (declared.length === 0) return [];
    const hooks = this.hookBodies(code);
    return declared.filter(
      name => !hooks.some(body => this.assigns(body, name))
    );
  }

  /** The argument text of every `beforeEach(` / `afterEach(` call. */
  private static hookBodies(code: string): string[] {
    const bodies: string[] = [];
    for (const match of code.matchAll(this.RESET_HOOK)) {
      const open = (match.index ?? 0) + match[0].length;
      let depth = 1;
      let end = open;
      while (end < code.length && depth > 0) {
        const char = code[end];
        if (char === '(') depth++;
        else if (char === ')') depth--;
        end++;
      }
      bodies.push(code.slice(open, end));
    }
    return bodies;
  }

  /** `name = …` (not `==`, `=>`, nor a property `x.name =`) in the text. */
  private static assigns(body: string, name: string): boolean {
    const escaped = name.replace(/\$/g, '\\$');
    return new RegExp(`(?<![\\w$.])${escaped}\\s*=(?![=>])`).test(body);
  }
}
