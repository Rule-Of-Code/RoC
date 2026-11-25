/**
 * #619 — an environment variable is turned into a config path by removing the
 * prefix, lower-casing the rest and splitting it on `_`, so a camelCase key
 * could never be set: ROC_LAWS_PARETOMODE=false became `laws.paretomode`, a
 * key nothing reads, and nothing said so.
 *
 * The path is now matched against the config's keys case-insensitively,
 * segment by segment, and takes the schema's spelling; a prefixed variable
 * that matches no key is a warning.
 */
import fs from 'fs';
import path from 'path';
import * as ts from 'typescript';
import { CONFIG_KEY_PATHS } from '../../src/config/config-key-paths';
import { ConfigurationFileLoaderConfiguration } from '../../src/utils/config/configuration-file-loader/configuration-file-loader-configuration';
import { ConfigurationFileLoader } from '../../src/utils/config/configuration-file-loader/configuration-file-loader';

const set: string[] = [];
const env = (name: string, value: string): void => {
  process.env[name] = value;
  set.push(name);
};

let warn: jest.SpyInstance;
beforeEach(() => {
  warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => {
  for (const name of set.splice(0)) delete process.env[name];
  warn.mockRestore();
});

/** The warnings that name this variable. */
const warningsAbout = (name: string): string[] =>
  warn.mock.calls.map(call => String(call[0])).filter(m => m.includes(name));

describe('#619: an environment variable sets a camelCase config key', () => {
  it('ROC_LAWS_PARETOMODE=false sets laws.paretoMode', () => {
    env('ROC_LAWS_PARETOMODE', 'false');
    const config = ConfigurationFileLoader.loadFromEnvironment();
    expect(config).toMatchObject({ laws: { paretoMode: false } });
    expect(config?.laws).not.toHaveProperty('paretomode');
    expect(warningsAbout('ROC_LAWS_PARETOMODE')).toEqual([]);
  });

  it('RULEOFCODE_PERFORMANCE_MAXCONCURRENT=2 sets performance.maxConcurrent', () => {
    env('RULEOFCODE_PERFORMANCE_MAXCONCURRENT', '2');
    expect(ConfigurationFileLoader.loadFromEnvironment()).toMatchObject({
      performance: { maxConcurrent: 2 },
    });
  });

  it('a nested camelCase key takes the schema spelling at every level', () => {
    env('ROC_THRESHOLDS_GIT_MAXCOMMITSPERBRANCH', '30');
    expect(ConfigurationFileLoader.loadFromEnvironment()).toMatchObject({
      thresholds: { git: { maxCommitsPerBranch: 30 } },
    });
  });

  it('control: a lower-case key is set as before, without a warning', () => {
    env('ROC_REPORTING_VERBOSE', 'true');
    expect(ConfigurationFileLoader.loadFromEnvironment()).toMatchObject({
      reporting: { verbose: true },
    });
    expect(warningsAbout('ROC_REPORTING_VERBOSE')).toEqual([]);
  });

  it('control: an entry of a free-form map (laws.severity.<law>) is set, without a warning', () => {
    env('ROC_LAWS_SEVERITY_COMMITSIZE', 'warning');
    expect(ConfigurationFileLoader.loadFromEnvironment()).toMatchObject({
      laws: { severity: { commitsize: 'warning' } },
    });
    expect(warningsAbout('ROC_LAWS_SEVERITY_COMMITSIZE')).toEqual([]);
  });

  it('control: a variable that matches no config key is a warning, not silence', () => {
    env('ROC_LAWS_PARETOMOD', 'true');
    const config = ConfigurationFileLoader.loadFromEnvironment();
    expect(warningsAbout('ROC_LAWS_PARETOMOD')).toEqual([
      'Environment variable ROC_LAWS_PARETOMOD matches no config key (set as laws.paretomod)',
    ]);
    expect(config?.laws).not.toHaveProperty('paretoMode');
  });

  it('control: a variable that names a section, not a setting, is a warning', () => {
    env('ROC_THRESHOLDS_GIT', '5');
    ConfigurationFileLoader.loadFromEnvironment();
    expect(warningsAbout('ROC_THRESHOLDS_GIT')).toEqual([
      'Environment variable ROC_THRESHOLDS_GIT matches no config key (set as thresholds.git)',
    ]);
  });
});

/**
 * The property paths of RuleOfCodeConfig, read from src/config/types.ts with
 * the TypeScript compiler: nested object types (inline, a local interface or
 * type alias, or the object member of a union) are walked; Record<…> is a
 * free-form map (`*`); anything else is a setting.
 */
function interfacePaths(): string[] {
  const file = path.join(__dirname, '../../src/config/types.ts');
  const source = ts.createSourceFile(
    file,
    fs.readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true
  );
  const declarations = new Map<string, ts.Node>();
  ts.forEachChild(source, node => {
    if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) {
      declarations.set(node.name.text, node);
    }
  });
  const membersOf = (
    type: ts.TypeNode | undefined
  ): ts.NodeArray<ts.TypeElement> | '*' | null => {
    if (!type) return null;
    if (ts.isParenthesizedTypeNode(type)) return membersOf(type.type);
    if (ts.isTypeLiteralNode(type)) return type.members;
    if (ts.isUnionTypeNode(type)) {
      for (const member of type.types) {
        const found = membersOf(member);
        if (found) return found;
      }
      return null;
    }
    if (ts.isTypeReferenceNode(type)) {
      const name = type.typeName.getText(source);
      if (name === 'Record') return '*';
      const declaration = declarations.get(name);
      if (declaration && ts.isInterfaceDeclaration(declaration)) {
        return declaration.members;
      }
      if (declaration && ts.isTypeAliasDeclaration(declaration)) {
        return membersOf(declaration.type);
      }
    }
    return null;
  };
  const paths: string[] = [];
  const walk = (members: ts.NodeArray<ts.TypeElement>, prefix: string) => {
    for (const member of members) {
      if (!ts.isPropertySignature(member)) continue;
      const name = member.name.getText(source).replace(/['"]/g, '');
      const at = prefix ? `${prefix}.${name}` : name;
      const inner = membersOf(member.type);
      if (inner === '*') paths.push(`${at}.*`);
      else if (inner) walk(inner, at);
      else paths.push(at);
    }
  };
  const root = declarations.get('RuleOfCodeConfig');
  if (root && ts.isInterfaceDeclaration(root)) walk(root.members, '');
  return paths;
}

describe('#619: CONFIG_KEY_PATHS is the config schema', () => {
  it('equals the property paths of RuleOfCodeConfig', () => {
    expect([...CONFIG_KEY_PATHS].sort()).toEqual(interfacePaths().sort());
  });

  it('holds no two settings that differ only in case', () => {
    const lower = CONFIG_KEY_PATHS.map(p => p.toLowerCase());
    expect(new Set(lower).size).toBe(lower.length);
  });
});

describe("#619: RuleOfCode's own variables are not config", () => {
  const own = ConfigurationFileLoaderConfiguration.NON_CONFIG_ENV_VARS;

  it.each([...own])('%s is neither set nor warned about', name => {
    const before = process.env[name];
    try {
      process.env[name] = '1';
      const config = ConfigurationFileLoader.loadFromEnvironment();
      expect(warningsAbout(name)).toEqual([]);
      const key = name.replace(/^ROC_/, '').toLowerCase().split('_')[0] ?? '';
      expect(config ?? {}).not.toHaveProperty(key);
    } finally {
      if (before === undefined) delete process.env[name];
      else process.env[name] = before;
    }
  });

  it('control: a name that only starts like one of them is warned about', () => {
    env('ROC_CLIENT', '1');
    ConfigurationFileLoader.loadFromEnvironment();
    expect(warningsAbout('ROC_CLIENT')).toHaveLength(1);
  });

  it('lists every prefixed variable the repository reads by name', () => {
    const root = path.join(__dirname, '../..');
    const read = new Set<string>();
    const scan = (dir: string): void => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) scan(full);
        else if (/\.(?:ts|js|mjs|cjs)$/.test(entry.name)) {
          const reads = fs.readFileSync(full, 'utf8').matchAll(
            // A read, not a test that sets or deletes a variable.
            /(?<!delete\s+)process\.env(?:\.((?:ROC|RULEOFCODE)_[A-Z0-9_]+)\b|\[['"]((?:ROC|RULEOFCODE)_[A-Z0-9_]+)['"]\])(?!\s*=(?!=))/g
          );
          for (const match of reads) read.add(match[1] ?? match[2] ?? '');
        }
      }
    };
    for (const dir of ['src', 'scripts', 'templates', 'tests']) {
      scan(path.join(root, dir));
    }
    expect([...read].sort()).toEqual([...own].sort());
  });
});
