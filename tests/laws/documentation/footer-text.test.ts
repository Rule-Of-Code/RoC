/**
 * The footer of a Markdown file as MD Footer Footer Consistency reads it,
 * tested where the readers live.
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  checkFooterLinks,
  extractFooter,
  fileMatchesTemplate,
  hasFooterElement,
  hasFooterKeywords,
  isFileFooterCurrent,
  isFooterYearCurrent,
  normalizeFooterPattern,
  validateFooterLinksInFile,
} from '../../../src/laws/documentation/footer-text';
import { makeTempDir, removeTempDirs } from '../../helpers/temp-dirs';

const LINES = { footerLastLinesCount: 5 };

describe('footer text', () => {
  it('the footer is what follows the last separator, when it reads as one', () => {
    const text =
      '# Title\n\n---\n\nmiddle\n\n---\nCopyright 2020 Example. MIT License.\n';
    expect(extractFooter(text, LINES)).toBe(
      'Copyright 2020 Example. MIT License.'
    );
    expect(
      extractFooter('# Title\n\nno footer words here\n', LINES)
    ).toBeNull();
  });

  it('without a separator the last lines are read, as many as configured', () => {
    const text = ['a', 'b', 'c', 'Maintainer: someone'].join('\n');
    expect(extractFooter(text, { footerLastLinesCount: 1 })).toBe(
      'Maintainer: someone'
    );
    expect(hasFooterKeywords('Maintainer: someone')).toBe(true);
    expect(hasFooterKeywords('')).toBe(false);
  });

  it('elements, normalisation and year', () => {
    expect(hasFooterElement('© Example', 'copyright')).toBe(true);
    expect(hasFooterElement('Apache 2.0', 'license')).toBe(true);
    expect(hasFooterElement('anything', 'unknown')).toBe(false);
    expect(
      normalizeFooterPattern('Copyright 2024  a@b.io  https://x.dev/y')
    ).toBe('copyright YEAR EMAIL URL');
    expect(isFooterYearCurrent('Copyright 1999')).toBe(false);
    expect(isFooterYearCurrent(`Copyright ${new Date().getFullYear()}`)).toBe(
      true
    );
    expect(isFooterYearCurrent('no year')).toBe(true);
  });
});

describe('footer files', () => {
  let dir: string;
  beforeEach(() => {
    dir = makeTempDir('footer-text-');
  });
  afterEach(removeTempDirs);

  it('a relative footer link must resolve beside the file', () => {
    const file = path.join(dir, 'README.md');
    fs.writeFileSync(path.join(dir, 'LICENSE.md'), 'MIT');
    expect(checkFooterLinks('[License](./LICENSE.md)', file)).toBe(true);
    expect(checkFooterLinks('[Gone](./GONE.md)', file)).toBe(false);
    expect(checkFooterLinks('[Site](https://example.com)', file)).toBe(true);

    fs.writeFileSync(file, '# Readme\n\n---\nLicense: [License](./GONE.md)\n');
    expect(validateFooterLinksInFile(file, LINES)).toBe(false);
  });

  it('a file without a footer, or that cannot be read, passes the per-file checks', () => {
    const plain = path.join(dir, 'plain.md');
    fs.writeFileSync(plain, '# Just a title\n');
    expect(isFileFooterCurrent(plain, LINES)).toBe(true);
    expect(fileMatchesTemplate(plain, 'anything', LINES)).toBe(true);
    expect(validateFooterLinksInFile(path.join(dir, 'missing.md'), LINES)).toBe(
      true
    );
  });

  it('a footer is compared with the template after normalisation', () => {
    const file = path.join(dir, 'doc.md');
    fs.writeFileSync(file, '# Doc\n\n---\nCopyright 2024 Example\n');
    expect(fileMatchesTemplate(file, 'copyright YEAR example', LINES)).toBe(
      true
    );
    expect(fileMatchesTemplate(file, 'license', LINES)).toBe(false);
  });
});
