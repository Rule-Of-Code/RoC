/**
 * ReactListKeyStability (#244): a list key is not the `.map` index — read
 * from the JSX parse, with an inline reason for a list that never reorders.
 */
import { ReactListKeyStabilityLaw } from '../../../src/checkers/react-laws/react-list-key-stability';
import { removeProjects } from '../toolkit-fixture';
import { describeFailsClosed, describeSelection, REACT_DEPS, run } from './react-law-fixture';

afterAll(removeProjects);

const law = ReactListKeyStabilityLaw;
const check = (list: string) =>
  run(law, {
    'src/list.tsx': ['export function List({ items }) {', '  return (', '    <ul>', list, '    </ul>', '  );', '}'].join('\n'),
  });

describe('ReactListKeyStabilityLaw (#244) — red', () => {
  it.each([
    ['key={i}', '      {items.map((item, i) => <li key={i}>{item.name}</li>)}'],
    ['key={index} in a function callback', '      {items.map(function (item, index) { return <li key={index}>{item.name}</li>; })}'],
    ['a template of the index alone', '      {items.map((item, i) => <li key={`row-${i}`}>{item.name}</li>)}'],
    ['String(i)', '      {items.map((item, i) => <li key={String(i)}>{item.name}</li>)}'],
    ['i.toString()', '      {items.map((item, i) => <Row key={i.toString()} item={item} />)}'],
  ])('%s', (_name, list) => {
    const result = check(list);
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      expect.stringMatching(/^src\/list\.tsx:4: <\w+ key=\{…\w+…\}> uses the \.map index as its key/),
    ]);
  });
});

describe('ReactListKeyStabilityLaw (#244) — green', () => {
  it.each([
    ['a stable id', '      {items.map(item => <li key={item.id}>{item.name}</li>)}'],
    ['id mixed with the index', '      {items.map((item, i) => <li key={`${item.id}-${i}`}>{item.name}</li>)}'],
    ['an index used for something other than the key', '      {items.map((item, i) => <li key={item.id} data-pos={i}>{item.name}</li>)}'],
    ['a key named like an index outside .map', '      {(() => { const i = 1; return <li key={i}>x</li>; })()}'],
    [
      'an inline reason above a static list',
      ['      {STEPS.map((step, i) => (', '        // roc-allow-index-key: the steps are a constant and never reorder', '        <li key={i}>{step}</li>', '      ))}'].join('\n'),
    ],
  ])('%s', (_name, list) => {
    expect(check(list).violations).toEqual([]);
  });

  it('an inline reason inside JSX braces also answers it', () => {
    const list = ['      {/* roc-allow-index-key: fixed table header */}', '      {COLS.map((c, i) => <th key={i}>{c}</th>)}'].join('\n');
    expect(check(list).violations).toEqual([]);
  });

  it('control: the static list without its reason IS found', () => {
    expect(check('      {STEPS.map((step, i) => <li key={i}>{step}</li>)}').violations).toHaveLength(1);
  });
});

describeFailsClosed('ReactListKeyStabilityLaw', law, REACT_DEPS);
describeSelection('ReactListKeyStabilityLaw.check', REACT_DEPS);
