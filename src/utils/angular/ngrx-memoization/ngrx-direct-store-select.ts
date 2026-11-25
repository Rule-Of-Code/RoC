import type * as TS from 'typescript';

import { FileUtils } from '../../file-utils';
import { PathOperations } from '../../path-operations';
import {
  loadTypeScript,
  parserUnavailable,
  TsxSource,
  type TypeScriptModule,
} from '../../react/tsx-source';

/** The package whose `Store` this check is about. */
const STORE_PACKAGE = '@ngrx/store';
/** The conventional name of an injected Store, judged when nothing says otherwise. */
const STORE_NAME = 'store';

/** A file whose text could hold a `.select` call; anything else is not parsed. */
const SELECT_CALL = /\.\s*select\s*[(<]/;

/** What one component file says about its store.select calls. */
type DirectSelectReading = 'direct' | 'none' | 'not-parsed';

/**
 * A component's `store.select` calls, read from its syntax tree (#612).
 *
 * A call is direct when its first argument is a string key
 * (`store.select('users')`) or an inline projector
 * (`store.select(s => s.users)`). Anything else — `selectUsers`,
 * `(selectUsers)`, `fromUser.selectAll`, `selectUserById(id)` — is a selector.
 * As text, a call in a comment, `this.restore.select(…)` and a parenthesised
 * selector all looked direct, and `store.select<User[]>(…)` did not.
 *
 * The receiver is a Store when the file types or injects it as the `Store` of
 * `@ngrx/store`, or when it is named `store`, the file imports from
 * `@ngrx/store` and does not declare it as something else (it may come from a
 * base class). Without that import the name says nothing: `d3.select(…)` or a
 * Redux `createStore()` held in `store` has a `.select` of its own. A
 * ComponentStore or a signal store held in `store` is declared as its own
 * class, and an inline projector is how a ComponentStore is read, so it is not
 * judged.
 */
export class NgRxDirectStoreSelect {
  /**
   * The files with a direct store.select, and a note for every file that was
   * not read: as text the call cannot be told from a comment, so without the
   * parser there is no fallback.
   */
  static readFiles(
    projectRoot: string,
    files: readonly string[]
  ): { direct: string[]; notRead: string[] } {
    const ts = loadTypeScript(projectRoot);
    const direct: string[] = [];
    const notRead: string[] = [];
    let withoutParser = 0;
    for (const file of files) {
      const content = FileUtils.readFile(file);
      if (!SELECT_CALL.test(content)) continue;
      if (!ts) {
        withoutParser++;
        continue;
      }
      const reading = this.read(ts, file, content);
      if (reading === 'direct') direct.push(file);
      if (reading === 'not-parsed') {
        notRead.push(
          `${PathOperations.getRelative(projectRoot, file)}: could not be parsed — its store.select calls were NOT read`
        );
      }
    }
    if (withoutParser > 0) {
      notRead.push(
        parserUnavailable(
          projectRoot,
          `the store.select calls of ${withoutParser} component file(s)`
        )
      );
    }
    return { direct, notRead };
  }

  /** Read one component file; `not-parsed` when it has syntax errors. */
  private static read(
    ts: TypeScriptModule,
    file: string,
    content: string
  ): DirectSelectReading {
    const source = TsxSource.parse(ts, file, content);
    if (source.parseErrors().length > 0) return 'not-parsed';
    const isStore = this.storeReceivers(ts, source);
    let direct = false;
    source.walk(node => {
      if (direct || !ts.isCallExpression(node)) return;
      const callee = node.expression;
      const [argument] = node.arguments;
      direct =
        argument !== undefined &&
        ts.isPropertyAccessExpression(callee) &&
        callee.name.text === 'select' &&
        isStore(this.receiverName(ts, callee.expression)) &&
        this.bypassesSelectors(ts, argument);
    });
    return direct ? 'direct' : 'none';
  }

  /** `store` and `this.store` (also `this.#store`) → the receiver's name. */
  private static receiverName(
    ts: TypeScriptModule,
    receiver: TS.Expression
  ): string | undefined {
    if (ts.isIdentifier(receiver)) return receiver.text;
    return ts.isPropertyAccessExpression(receiver) &&
      receiver.expression.kind === ts.SyntaxKind.ThisKeyword
      ? receiver.name.text
      : undefined;
  }

  /** A string key or an inline projector, also inside parentheses or a cast. */
  private static bypassesSelectors(
    ts: TypeScriptModule,
    argument: TS.Expression
  ): boolean {
    let value = argument;
    while (
      ts.isParenthesizedExpression(value) ||
      ts.isAsExpression(value) ||
      ts.isNonNullExpression(value)
    ) {
      value = value.expression;
    }
    return (
      ts.isStringLiteralLike(value) ||
      ts.isArrowFunction(value) ||
      ts.isFunctionExpression(value)
    );
  }

  /** Which receiver names are a Store of `@ngrx/store` in this file. */
  private static storeReceivers(
    ts: TypeScriptModule,
    source: TsxSource
  ): (name: string | undefined) => boolean {
    const fromStorePackage = source
      .imports()
      .filter(declaration => declaration.module === STORE_PACKAGE);
    // The name `store` counts only in a file that imports from @ngrx/store.
    const byName = fromStorePackage.length > 0;
    const storeClasses = new Set(
      fromStorePackage
        .flatMap(declaration => declaration.named)
        .filter(({ imported }) => imported === 'Store')
        .map(({ local }) => local)
    );
    const stores = new Set<string>();
    const others = new Set<string>();
    source.walk(node => {
      const declared = this.declaredClass(ts, node);
      if (!declared) return;
      (storeClasses.has(declared.type) ? stores : others).add(declared.name);
    });
    return name =>
      name !== undefined &&
      (stores.has(name) ||
        (byName && name === STORE_NAME && !others.has(name)));
  }

  /** The class a parameter, property or variable is typed as or injected with. */
  private static declaredClass(
    ts: TypeScriptModule,
    node: TS.Node
  ): { name: string; type: string } | null {
    if (
      !ts.isParameter(node) &&
      !ts.isPropertyDeclaration(node) &&
      !ts.isVariableDeclaration(node)
    ) {
      return null;
    }
    if (!ts.isIdentifier(node.name) && !ts.isPrivateIdentifier(node.name)) {
      return null;
    }
    const type =
      this.typeName(ts, node.type) ?? this.injectedClass(ts, node.initializer);
    return type === undefined ? null : { name: node.name.text, type };
  }

  private static typeName(
    ts: TypeScriptModule,
    type: TS.TypeNode | undefined
  ): string | undefined {
    return type &&
      ts.isTypeReferenceNode(type) &&
      ts.isIdentifier(type.typeName)
      ? type.typeName.text
      : undefined;
  }

  /** `inject(Store)` and `new UserStore()` → the class they name. */
  private static injectedClass(
    ts: TypeScriptModule,
    value: TS.Expression | undefined
  ): string | undefined {
    if (!value) return undefined;
    if (ts.isNewExpression(value) && ts.isIdentifier(value.expression)) {
      return value.expression.text;
    }
    if (!ts.isCallExpression(value) || !ts.isIdentifier(value.expression)) {
      return undefined;
    }
    const [token] = value.arguments;
    return value.expression.text === 'inject' && token && ts.isIdentifier(token)
      ? token.text
      : undefined;
  }
}
