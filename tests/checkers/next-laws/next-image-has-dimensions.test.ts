/**
 * NextImageHasDimensions (#228): <img> needs width and height; next/image
 * needs them, fill, or a statically imported src; a spread fails closed.
 */
import { NextImageHasDimensionsLaw as Law } from '../../../src/checkers/next-laws/next-image-has-dimensions';
import { removeProjects } from '../toolkit-fixture';
import { nextCtx } from './next-fixture';

afterAll(removeProjects);

const component = (body: string, imports = "import Image from 'next/image';") =>
  nextCtx({ 'src/app/hero.tsx': `${imports}\nexport function Hero(p) {\n  return (\n${body}\n  );\n}` });

describe('NextImageHasDimensionsLaw (#228)', () => {
  it.each([
    ['<img> without height', '<img src="/a.png" width={10} alt="" />', /hero\.tsx:4: <img> without height/],
    ['<img> with neither', '<img\n  src="/a.png"\n  alt=""\n/>', /hero\.tsx:4: <img> without width and height/],
    ['next/image without dimensions', '<Image src="/a.png" alt="" />', /<Image> without width and height, fill or a statically imported src/],
    ['fill={false} is not fill', '<Image src="/a.png" fill={false} alt="" />', /<Image> without width and height/],
    ['a spread fails closed', '<img {...p} alt="" />', /a \{\.\.\.spread\} may set them/],
  ])('red: %s', (_name, body, pattern) => {
    const result = Law.check(component(body));
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([expect.stringMatching(pattern)]);
  });

  it.each([
    ['<img> with both (control: the element is read)', '<img src="/a.png" width={10} height={10} alt="" />'],
    ['next/image with both', '<Image src="/a.png" width={100} height={20} alt="" />'],
    ['next/image with fill', '<div style={{ position: "relative" }}><Image src="/a.png" fill alt="" /></div>'],
    ['next/legacy/image layout="fill"', '<Image src="/a.png" layout="fill" alt="" />'],
  ])('green: %s', (_name, body) => {
    const imports = body.includes('legacy') ? "import Image from 'next/legacy/image';" : "import Image from 'next/image';";
    expect(Law.check(component(body.replace('legacy/image ', ''), imports)).violations).toEqual([]);
  });

  it('green: a statically imported image needs no dimensions', () => {
    const result = Law.check(component('<Image src={hero} alt="" />', "import Image from 'next/image';\nimport hero from './hero.jpg';"));
    expect(result.violations).toEqual([]);
  });

  it('an <Image> from another library is not next/image', () => {
    expect(Law.check(component('<Image src="/a.png" />', "import { Image } from 'some-ui';")).violations).toEqual([]);
  });

  it('the control: an unflagged image is still seen when another is flagged in the same file', () => {
    const result = Law.check(component('<><img src="/a" width={1} height={1} alt="" /><img src="/b" alt="" /></>'));
    expect(result.violations).toHaveLength(1);
  });
});
