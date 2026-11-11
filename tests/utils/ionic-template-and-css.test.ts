/**
 * The tolerant readers the Ionic rendering laws stand on: an Angular template
 * as a tree of elements, and a stylesheet as rules with declarations.
 */
import { CssRules } from '../../src/utils/ionic/css-rules';
import { HtmlTemplate } from '../../src/utils/ionic/html-template';

describe('HtmlTemplate', () => {
  it('reads tags with parents and lines; a quoted ">" does not end a tag; comments are blank', () => {
    const elements = HtmlTemplate.elements(
      [
        '<!-- <ion-fab></ion-fab> -->',
        '<ion-content (click)="a > b && go()"',
        '  [scrollEvents]="true">',
        '  <div class="wrap a"><img src="x"><ion-fab slot="fixed" /></div>',
        '</ion-content>',
        '<p>after</p>',
      ].join('\n')
    );
    expect(elements.map(e => `${e.tag}@${e.line}`)).toEqual([
      'ion-content@2',
      'div@4',
      'img@4',
      'ion-fab@4',
      'p@6',
    ]);
    const [content, div, img, fab, p] = elements;
    expect(HtmlTemplate.attribute(content!, '(click)')?.value).toBe('a > b && go()');
    expect(HtmlTemplate.bound(content!, 'scrollEvents')?.value).toBe('true');
    expect(div?.parent).toBe(content);
    expect(img?.parent).toBe(div);
    expect(fab?.parent).toBe(div);
    expect(p?.parent).toBeNull();
    expect(HtmlTemplate.classes(div!)).toEqual(['wrap', 'a']);
  });

  it('ng-container is transparent; slot="fixed" on the direct child is outside the scroller', () => {
    const [content, container, fixed, inner, plain] = HtmlTemplate.elements(
      '<ion-content><ng-container><p slot="fixed"><b></b></p></ng-container><i></i></ion-content>'
    );
    expect(HtmlTemplate.domParent(fixed!)).toBe(content);
    expect(container?.tag).toBe('ng-container');
    expect(HtmlTemplate.insideScroller(fixed!)).toBe(false);
    expect(HtmlTemplate.insideScroller(inner!)).toBe(false);
    expect(HtmlTemplate.insideScroller(plain!)).toBe(true);
  });

  it('script and style bodies are skipped; an unmatched closing tag is ignored', () => {
    const elements = HtmlTemplate.elements('<style>a<b{}</style></span><script>if (a<b) {}</script><meta name="x">');
    expect(elements.map(e => e.tag)).toEqual(['style', 'script', 'meta']);
  });
});

describe('CssRules', () => {
  it('reads selectors, declarations and lines; comments are blank', () => {
    const rules = CssRules.parse('/* .a { top: 0 } */\n.bar,\n.nav { position: fixed;\n  top: 0 }\n');
    expect(rules).toEqual([
      {
        selector: '.bar, .nav',
        line: 2,
        declarations: [
          { property: 'position', value: 'fixed', line: 3 },
          { property: 'top', value: '0', line: 4 },
        ],
      },
    ]);
  });

  it('SCSS: nesting joins selectors, & replaces the parent, @media keeps it, // comments only in SCSS', () => {
    const rules = CssRules.parse(
      '.page {\n  // .x { top: 0 }\n  &__bar { top: 0; }\n  .title { color: red; }\n  @media (min-width: 1px) { padding: 0; }\n  background: url(http://x/y.png);\n}',
      'a.scss'
    );
    const bySelector: Record<string, string[]> = {};
    for (const rule of rules) {
      bySelector[rule.selector] = [...(bySelector[rule.selector] ?? []), ...rule.declarations.map(d => d.property)];
    }
    expect(bySelector).toEqual({
      '.page__bar': ['top'],
      '.page .title': ['color'],
      '.page': expect.arrayContaining(['padding', 'background']),
    });
    expect(rules.flatMap(r => r.declarations).find(d => d.property === 'background')?.value).toBe('url(http://x/y.png)');
  });

  it('@keyframes and @font-face are not element rules', () => {
    expect(CssRules.parse('@keyframes k { from { top: 0; } }\n@font-face { src: url(x); }')).toEqual([]);
  });

  it('subject classes are the last compound of each selector', () => {
    expect(CssRules.subjectClasses('.a .b.c, .d > .e:hover')).toEqual(['b', 'c', 'e']);
  });
});
