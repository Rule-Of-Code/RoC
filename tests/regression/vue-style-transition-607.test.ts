/**
 * #607 — No Layout Transition reads the `<style>` blocks of `.vue`
 * single-file components. A layout transition in a component's style is
 * reported at its own line; the same text in the template or the script is
 * not CSS; a transform transition is fine; a .css file is read as before.
 */
import { NoLayoutTransitionLaw } from '../../src/checkers/fe-architecture-laws/no-layout-transition';
import {
  runLawScope,
  vueNotReadNote,
} from '../../src/utils/vue/vue-read-tracker';
import { ctx, project, removeProjects } from '../checkers/toolkit-fixture';

afterAll(removeProjects);

const PANEL = [
  '<template>', //                                                        1
  '  <div style="transition: width 1s">transition: height 1s</div>', //   2
  '</template>', //                                                       3
  '<script setup lang="ts">', //                                          4
  "const css = 'transition: margin 1s';", //                              5
  '</script>', //                                                         6
  '<style scoped lang="scss">', //                                        7
  '.panel {', //                                                          8
  '  transition: width 0.2s ease;', //                                    9
  '  &.open { transition-property: transform, opacity; }', //            10
  '}', //                                                                11
  '</style>', //                                                         12
  '<style>', //                                                          13
  '.drawer { transition: left 0.3s; }', //                               14
  '</style>', //                                                         15
  '',
].join('\n');

const vueProject = (files: Record<string, string>): string =>
  project({
    'package.json': JSON.stringify({
      name: 'app',
      version: '1.0.0',
      dependencies: { vue: '^3.5.0' },
    }),
    'src/main.ts':
      "import { createApp } from 'vue';\nexport const app = createApp;\n",
    ...files,
  });

describe('#607 No Layout Transition reads the <style> of .vue components', () => {
  it('reports each style block at the component line; template and script text is not CSS', async () => {
    const root = vueProject({ 'src/components/Panel.vue': PANEL });
    const { value, scope } = await runLawScope(() =>
      NoLayoutTransitionLaw.check(ctx(root))
    );
    expect(value.violations).toEqual([
      expect.stringMatching(
        /^src[\\/]components[\\/]Panel\.vue:9: transition animates a layout property \(width\)/
      ),
      expect.stringMatching(
        /^src[\\/]components[\\/]Panel\.vue:14: transition animates a layout property \(left\)/
      ),
    ]);
    expect(vueNotReadNote(scope, ['src/components/Panel.vue'])).toBeNull();
  });

  it('a component whose style transitions transform only passes', () => {
    const root = vueProject({
      'src/components/Fade.vue':
        '<template><p>transition: width 1s</p></template>\n<style>\n.fade { transition: opacity 0.2s, transform 0.2s; }\n</style>\n',
    });
    expect(NoLayoutTransitionLaw.check(ctx(root)).violations).toEqual([]);
  });

  it('control: a .css file is read as before', () => {
    const root = vueProject({
      'src/styles/app.css': '.a {\n  transition: height 1s;\n}\n',
    });
    expect(NoLayoutTransitionLaw.check(ctx(root)).violations).toEqual([
      expect.stringMatching(/^src[\\/]styles[\\/]app\.css:2: .*\(height\)/),
    ]);
  });
});
