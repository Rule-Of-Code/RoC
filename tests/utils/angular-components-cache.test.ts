/**
 * The Ionic template laws share one parse per audit: the second scan of the
 * same files parses nothing, an edited file is parsed again, and a caller
 * that changes its arrays does not change what the next law sees.
 */
import fs from 'fs';
import path from 'path';
import { AngularComponents } from '../../src/utils/ionic/angular-components';
import { TsxSource } from '../../src/utils/react/tsx-source';
import { ctx, manifest, project, removeProjects } from '../checkers/toolkit-fixture';

afterAll(removeProjects);

const component = (selector: string): string =>
  `import { Component } from '@angular/core';\n@Component({ selector: '${selector}', template: '<ion-content></ion-content>' })\nexport class C {}\n`;

describe('AngularComponents.scan cache', () => {
  it('parses each file once across scans of the same files', () => {
    const root = project({
      'package.json': manifest({ '@ionic/angular': '8' }),
      'src/a.page.ts': component('app-a'),
      'src/b.page.ts': component('app-b'),
    });
    const parse = jest.spyOn(TsxSource, 'parse');
    const first = AngularComponents.scan(ctx(root));
    const parsedOnce = parse.mock.calls.length;
    const second = AngularComponents.scan(ctx(root));
    expect(parsedOnce).toBe(2);
    expect(parse.mock.calls.length).toBe(parsedOnce);
    expect(second.components.map(c => c.selectors)).toEqual(first.components.map(c => c.selectors));
    parse.mockRestore();
  });

  it('parses again after a file changes (the control)', () => {
    const root = project({
      'package.json': manifest({ '@ionic/angular': '8' }),
      'src/a.page.ts': component('app-a'),
    });
    expect(AngularComponents.scan(ctx(root)).components.flatMap(c => c.selectors)).toEqual(['app-a']);
    const file = path.join(root, 'src/a.page.ts');
    fs.writeFileSync(file, component('app-renamed-and-longer'));
    expect(AngularComponents.scan(ctx(root)).components.flatMap(c => c.selectors)).toEqual([
      'app-renamed-and-longer',
    ]);
  });

  it('gives each caller its own arrays', () => {
    const root = project({
      'package.json': manifest({ '@ionic/angular': '8' }),
      'src/a.page.ts': component('app-a'),
    });
    AngularComponents.scan(ctx(root)).components.length = 0;
    expect(AngularComponents.scan(ctx(root)).components).toHaveLength(1);
  });
});
