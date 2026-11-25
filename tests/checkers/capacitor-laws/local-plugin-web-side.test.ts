/**
 * The web side of Capacitor Local Plugin Contract, tested where it lives:
 * each registerPlugin<T>('Name') call, its name and the methods of T.
 */
import { webPlugins } from '../../../src/checkers/capacitor-laws/local-plugin-web-side';
import { loadTypeScript, TsxSource } from '../../../src/utils/react/tsx-source';
import { ctx } from '../toolkit-fixture';

const ts = loadTypeScript(process.cwd());
const ROOT = process.cwd();
const FILE = `${ROOT}/src/plugins/echo.ts`;

const read = (text: string) => {
  if (!ts) throw new Error('typescript must resolve in the RoC repository');
  return webPlugins(ctx(ROOT), TsxSource.parse(ts, FILE, text));
};

describe('webPlugins', () => {
  it('names the plugin and lists the methods of an extended interface', () => {
    const plugins = read(
      [
        "import { registerPlugin } from '@capacitor/core';",
        'interface Base { ping(): Promise<void>; addListener(): void }',
        'interface Echo extends Base { echo: (value: string) => Promise<string> }',
        "const NAME = 'Echo';",
        'export const EchoPlugin = registerPlugin<Echo>(NAME);',
      ].join('\n')
    );
    expect(plugins).toEqual([
      {
        where: 'src/plugins/echo.ts:5',
        name: 'Echo',
        methods: ['echo', 'ping'],
      },
    ]);
  });

  it('an intersection is followed; a generic type is not, and says so with null', () => {
    const plugins = read(
      [
        "import { registerPlugin as register } from '@capacitor/core';",
        "export const A = register<{ a(): void } & { b(): void }>('A');",
        "export const B = register<Partial<{ c(): void }>>('B');",
        "export const C = register('C');",
      ].join('\n')
    );
    expect(plugins.map(plugin => [plugin.name, plugin.methods])).toEqual([
      ['A', ['a', 'b']],
      ['B', null],
      ['C', null],
    ]);
  });

  it('a file that does not import registerPlugin from @capacitor/core has none', () => {
    expect(
      read(
        "import { registerPlugin } from './local';\nexport const X = registerPlugin<{ x(): void }>('X');"
      )
    ).toEqual([]);
  });
});
