import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { SeededRandomnessLaw } from '../../src/checkers/python-laws/seeded-randomness';
import { ALL_ENHANCED_CONSTITUTIONAL_LAWS } from '../../src/data/enhanced-laws';
import { FileUtils } from '../../src/utils';
import type { RuleOfCodeConfig } from '../../src/types/law.types';

/**
 * The law was asking for one thing while two different requirements were in
 * play, and its advice was wrong for one of them.
 *
 * `random.choice()` in domain logic should be REPRODUCIBLE — seed it. But
 * `uuid4`, `secrets` and `os.urandom` are chosen precisely because their output
 * cannot be predicted: an identifier that travels in a share URL, an invite
 * code, a token. "Seed the RNG" there is not a testability improvement, it is a
 * security defect, and a sequential replacement leaks how many records exist.
 *
 * Both are still worth injecting, for different reasons — one so a run can be
 * repeated, the other so a test can substitute a stub.
 */
describe('seeded randomness tells reproducible from unpredictable', () => {
  let root: string;

  const write = (rel: string, content: string): void => {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  };

  const findings = (boundary?: string[]): string[] => {
    const config: RuleOfCodeConfig = FileUtils.getMinimalDefaultConfig();
    if (boundary) {
      config.thresholds = {
        ...config.thresholds,
        python: { ...config.thresholds?.python, randomnessBoundary: boundary },
      };
    }
    const result = SeededRandomnessLaw.check({ projectRoot: root, config });
    return result.violations ?? [];
  };

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-rand-'));
    write('pyproject.toml', '[project]\nname = "svc"\nversion = "0.1.0"\n');
  });
  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  describe('the advice matches the requirement', () => {
    it('tells a simulation to seed its generator', () => {
      write(
        'src/app/domain/sim.py',
        'import random\n\n\ndef pick(items):\n    return random.choice(items)\n'
      );

      const [finding = ''] = findings();

      expect(finding).toMatch(/seedable generator/);
      expect(finding).toMatch(/reproduced/);
    });

    it.each([
      ['ids.py', 'import uuid\n\n\ndef new_id():\n    return uuid.uuid4().hex\n'],
      [
        'invites.py',
        'import secrets\n\n\ndef code():\n    return secrets.token_urlsafe(16)\n',
      ],
      ['keys.py', 'import os\n\n\ndef key():\n    return os.urandom(32)\n'],
      [
        'picker.py',
        'import random\n\n\ndef pick(x):\n    return random.SystemRandom().choice(x)\n',
      ],
    ])('does not tell %s to seed its source', (name, source) => {
      write(`src/app/domain/${name}`, source);

      const [finding = ''] = findings();

      expect(finding).toMatch(/inject an id\/token factory/i);
      expect(finding).toMatch(/Do NOT seed this source/);
      expect(finding).toMatch(/do not replace it with a counter/);
      // The wrong advice must be gone, not merely accompanied by the right one.
      expect(finding).not.toMatch(/seedable/);
    });

    it('names the boundary knob as the sanctioned answer', () => {
      write('src/app/domain/ids.py', 'import uuid\n\n\ndef i():\n    return uuid.uuid4()\n');

      const [finding = ''] = findings();

      expect(finding).toMatch(/thresholds\.python\.randomnessBoundary/);
    });
  });

  describe('a declared boundary is a correct answer, not a silenced law', () => {
    it('accepts the module that owns identifier minting', () => {
      write('src/app/domain/ids.py', 'import uuid\n\n\ndef i():\n    return uuid.uuid4()\n');

      expect(findings(['src/app/domain/ids.py'])).toEqual([]);
    });

    // The red control: declaring the id factory does not exempt the rest.
    it('still reports ambient randomness elsewhere', () => {
      write('src/app/domain/ids.py', 'import uuid\n\n\ndef i():\n    return uuid.uuid4()\n');
      write(
        'src/app/domain/sim.py',
        'import random\n\n\ndef pick(x):\n    return random.choice(x)\n'
      );

      const remaining = findings(['src/app/domain/ids.py']);

      expect(remaining.length).toBe(1);
      expect(remaining[0]).toMatch(/sim\.py/);
    });
  });

  /**
   * The reporter's first suggestion: the law text itself never said the knob was
   * the sanctioned path rather than a dodge.
   */
  describe('the law text states the exception', () => {
    // The Law Card, not the runtime law object: `satisfiedBy`, `rationale` and
    // `detectionLimits` live on the data entry, and the registry's runtime
    // objects carry none of them.
    const law = (): { satisfiedBy?: Record<string, string> } =>
      ALL_ENHANCED_CONSTITUTIONAL_LAWS.find(
        entry => entry.title === 'Seeded Randomness'
      ) as { satisfiedBy?: Record<string, string> };

    it('names cryptographic sources in satisfiedBy', () => {
      expect(law().satisfiedBy?.python ?? '').toMatch(
        /uuid4, secrets, os\.urandom/
      );
    });

    it('says a declared boundary is not debt', () => {
      expect(law().satisfiedBy?.python ?? '').toMatch(/not debt/);
    });
  });
});
