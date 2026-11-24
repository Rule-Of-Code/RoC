/**
 * The web side of Capacitor Local Plugin Contract: every
 * `registerPlugin<T>('Name')` call, the name it registers and the methods of
 * its type argument, followed through same-file interfaces, aliases,
 * intersections and one relative import.
 */

import type * as TS from 'typescript';
import type { LawCheckContext } from '../../types/law.types';
import { relative } from '../../utils/capacitor/capacitor-law-support';
import {
  isRegisterPluginCall,
  registerPluginNames,
  resolveRelative,
  stringValue,
} from '../../utils/capacitor/capacitor-sources';
import {
  INHERITED_PLUGIN_METHODS,
  readText,
} from '../../utils/capacitor/native-plugins';
import { TsxSource } from '../../utils/react/tsx-source';

/** One registerPlugin call on the web side. */
export interface WebPlugin {
  where: string;
  name: string | null;
  /** Methods of the type argument, or null when the type could not be followed. */
  methods: string[] | null;
}

export function webPlugins(
  context: LawCheckContext,
  source: TsxSource
): WebPlugin[] {
  const registers = registerPluginNames(source);
  if (registers.size === 0) return [];
  const found: WebPlugin[] = [];
  source.walk(node => {
    if (!isRegisterPluginCall(source, node, registers)) return;
    const call = node as TS.CallExpression;
    const [type] = call.typeArguments ?? [];
    found.push({
      where: `${relative(context, source.fileName)}:${source.lineOf(call)}`,
      name: nameOf(source, call.arguments[0]),
      methods: type ? typeMethods(source, type, 0, true) : null,
    });
  });
  return found;
}

/** The plugin name: a literal, a same-file const, or a const imported one module away. */
function nameOf(
  source: TsxSource,
  argument: TS.Expression | undefined
): string | null {
  const local = stringValue(source, argument);
  if (local !== null || !argument || !source.ts.isIdentifier(argument))
    return local;
  const imported = importedFrom(source, argument.text);
  return imported
    ? stringValue(
        imported.source,
        imported.source.ts.factory.createIdentifier(imported.name)
      )
    : null;
}

/** The module a name is imported from, one relative import away, parsed. */
function importedFrom(
  source: TsxSource,
  local: string
): { source: TsxSource; name: string } | null {
  for (const info of source.imports()) {
    const binding = info.named.find(named => named.local === local);
    if (!binding || !info.module.startsWith('.')) continue;
    const file = resolveRelative(source.fileName, info.module);
    const text = file ? readText(file) : null;
    if (file && text !== null)
      return {
        source: TsxSource.parse(source.ts, file, text),
        name: binding.imported,
      };
  }
  return null;
}

/** Methods of a type, following same-file interfaces, aliases, intersections and one import. */
function typeMethods(
  source: TsxSource,
  type: TS.TypeNode,
  depth: number,
  mayImport: boolean
): string[] | null {
  const ts = source.ts;
  if (depth > 4) return null;
  if (ts.isTypeLiteralNode(type)) return memberNames(source, type.members);
  if (ts.isIntersectionTypeNode(type)) {
    const parts = type.types.map(part =>
      typeMethods(source, part, depth + 1, mayImport)
    );
    return parts.some(part => part === null)
      ? null
      : parts.flatMap(part => part ?? []);
  }
  if (ts.isParenthesizedTypeNode(type))
    return typeMethods(source, type.type, depth + 1, mayImport);
  if (
    !ts.isTypeReferenceNode(type) ||
    !ts.isIdentifier(type.typeName) ||
    type.typeArguments
  )
    return null;
  return namedTypeMethods(source, type.typeName.text, depth, mayImport);
}

/** `mayImport`: the one relative import this reader follows has not been used yet. */
function namedTypeMethods(
  source: TsxSource,
  name: string,
  depth: number,
  mayImport: boolean
): string[] | null {
  const ts = source.ts;
  for (const statement of source.sourceFile.statements) {
    if (
      ts.isInterfaceDeclaration(statement) &&
      statement.name.text === name &&
      !statement.typeParameters
    ) {
      return interfaceMethods(source, statement, depth, mayImport);
    }
    if (
      ts.isTypeAliasDeclaration(statement) &&
      statement.name.text === name &&
      !statement.typeParameters
    ) {
      return typeMethods(source, statement.type, depth + 1, mayImport);
    }
  }
  const imported = mayImport ? importedFrom(source, name) : null;
  return imported
    ? namedTypeMethods(imported.source, imported.name, depth + 1, false)
    : null;
}

/** An interface's own methods and those of the interfaces it extends. */
function interfaceMethods(
  source: TsxSource,
  statement: TS.InterfaceDeclaration,
  depth: number,
  mayImport: boolean
): string[] | null {
  const ts = source.ts;
  const inherited = (statement.heritageClauses ?? []).flatMap(
    clause => clause.types
  );
  const bases = inherited.map(base =>
    ts.isIdentifier(base.expression) && !base.typeArguments
      ? namedTypeMethods(source, base.expression.text, depth + 1, mayImport)
      : null
  );
  if (bases.some(base => base === null)) return null;
  return [
    ...memberNames(source, statement.members),
    ...bases.flatMap(base => base ?? []),
  ];
}

function memberNames(
  source: TsxSource,
  members: TS.NodeArray<TS.TypeElement>
): string[] {
  const ts = source.ts;
  return members.flatMap(member => {
    const callable =
      ts.isMethodSignature(member) ||
      (ts.isPropertySignature(member) &&
        member.type !== undefined &&
        ts.isFunctionTypeNode(member.type));
    if (
      !callable ||
      !member.name ||
      !(ts.isIdentifier(member.name) || ts.isStringLiteral(member.name))
    )
      return [];
    return INHERITED_PLUGIN_METHODS.has(member.name.text)
      ? []
      : [member.name.text];
  });
}
