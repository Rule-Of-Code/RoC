/**
 * Gating laws to their subject (#428) and making MD Footer Template opt-in
 * (#436) must not change the fast-mode core as a side effect. For every
 * release-canary profile, the core a project selects after the change is the
 * core it selected before, minus the laws it no longer selects at all, plus
 * Launch Readiness Checklist where the project declares a production
 * subject (it enters by its subject, from its own gated group).
 *
 * "Before" is the same registry with the wave's selection changes undone:
 * the five gated laws without `requires`, MD Footer on by default.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { ALL_ENHANCED_CONSTITUTIONAL_LAWS } from '../../src/data/enhanced-laws';
import { paretoCoreIds } from '../../src/data/pareto-core';
import type { EnhancedConstitutionalLaw } from '../../src/types/enhanced-law.types';
import {
  lawAppliesToProjectType,
  runsWithoutAllowlist,
} from '../../src/utils/law-identity';
import { lawRequirementsMet } from '../../src/utils/law-requirements';
import { selectionProjectType } from '../../src/utils/selection-project-type';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { STACKS } = require('../../scripts/release-canary') as {
  STACKS: Record<
    string,
    { files: Record<string, string>; projectType: string }
  >;
};

const GATED = [
  'CDN and Caching Strategy',
  'Performance Monitoring Standards',
  'Incident Response Protocol',
  'Launch Readiness Checklist',
  'NX Commands Only Policy',
  'Authentication Security',
];
const OPT_IN = 'MD Footer Template (MANDATORY)';
const ENTERS_BY_SUBJECT = 'Launch Readiness Checklist';
// Authentication Security is gated on the same subject (#428) and is a
// protected core law; in a gate group the quota counts only unprotected
// laws, so it does not take Launch Readiness's slot.
const GATED_PROTECTED = 'Authentication Security';
const PRODUCTION_SUBJECT_PROFILES = ['angular', 'ngrx', 'ionic', 'react'];
const NO_SUBJECT_PROFILES = ['python', 'node'];

const BEFORE: EnhancedConstitutionalLaw[] =
  ALL_ENHANCED_CONSTITUTIONAL_LAWS.map(law =>
    GATED.includes(law.title)
      ? { ...law, requires: undefined }
      : law.title === OPT_IN
        ? { ...law, defaultEnabled: true }
        : law
  );

const roots: string[] = [];
afterAll(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
});

function fixture(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-core-'));
  roots.push(root);
  for (const [rel, content] of Object.entries(files)) {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  return root;
}

/** What a project of this profile selects, and which of it is core. */
function selection(
  laws: readonly EnhancedConstitutionalLaw[],
  root: string,
  type: string
): { selected: Set<string>; core: Set<string> } {
  const projectType = selectionProjectType(type, root);
  const selected = laws.filter(
    law =>
      runsWithoutAllowlist(
        { name: law.title, id: law.id, defaultEnabled: law.defaultEnabled },
        {}
      ) &&
      lawAppliesToProjectType(law.stack, projectType, root, law, []) &&
      lawRequirementsMet(law.requires, root, [])
  );
  const ids = paretoCoreIds(laws);
  return {
    selected: new Set(selected.map(law => law.title)),
    core: new Set(
      selected.filter(law => ids.has(law.id)).map(law => law.title)
    ),
  };
}

describe('the fast-mode core survives gating (#428)', () => {
  it.each(Object.keys(STACKS))(
    '%s: the core is what it was, minus laws no longer selected, plus Launch Readiness by subject',
    name => {
      const stack = STACKS[name];
      if (!stack) throw new Error(name);
      const root = fixture(stack.files);
      const before = selection(BEFORE, root, stack.projectType);
      const after = selection(
        ALL_ENHANCED_CONSTITUTIONAL_LAWS,
        root,
        stack.projectType
      );
      const expected = new Set(
        [...before.core].filter(title => after.selected.has(title))
      );
      if (after.selected.has(ENTERS_BY_SUBJECT))
        expected.add(ENTERS_BY_SUBJECT);
      expect([...after.core].sort()).toEqual([...expected].sort());
    }
  );

  it.each(PRODUCTION_SUBJECT_PROFILES)(
    '%s (production subject): Authentication Security and Launch Readiness are both in the core',
    name => {
      const stack = STACKS[name];
      if (!stack) throw new Error(name);
      const after = selection(
        ALL_ENHANCED_CONSTITUTIONAL_LAWS,
        fixture(stack.files),
        stack.projectType
      );
      expect({
        auth: after.core.has(GATED_PROTECTED),
        launch: after.core.has(ENTERS_BY_SUBJECT),
      }).toEqual({ auth: true, launch: true });
    }
  );

  it.each(NO_SUBJECT_PROFILES)(
    '%s (no production subject): Launch Readiness is not selected',
    name => {
      const stack = STACKS[name];
      if (!stack) throw new Error(name);
      const after = selection(
        ALL_ENHANCED_CONSTITUTIONAL_LAWS,
        fixture(stack.files),
        stack.projectType
      );
      expect(after.selected.has(ENTERS_BY_SUBJECT)).toBe(false);
    }
  );

  it('no CRITICAL error law that was core and is still selected leaves the core (every profile)', () => {
    const criticalError = new Set(
      ALL_ENHANCED_CONSTITUTIONAL_LAWS.filter(
        law => law.priority === 'CRITICAL' && law.defaultSeverity === 'error'
      ).map(law => law.title)
    );
    const left: string[] = [];
    for (const [name, stack] of Object.entries(STACKS)) {
      const root = fixture(stack.files);
      const before = selection(BEFORE, root, stack.projectType);
      const after = selection(
        ALL_ENHANCED_CONSTITUTIONAL_LAWS,
        root,
        stack.projectType
      );
      for (const title of before.core)
        if (
          criticalError.has(title) &&
          after.selected.has(title) &&
          !after.core.has(title)
        )
          left.push(`${name}: ${title}`);
    }
    expect(left).toEqual([]);
  });

  it('CI/CD Constitutional Tribunal is in the core of every profile', () => {
    for (const [name, stack] of Object.entries(STACKS)) {
      const after = selection(
        ALL_ENHANCED_CONSTITUTIONAL_LAWS,
        fixture(stack.files),
        stack.projectType
      );
      expect({
        name,
        core: after.core.has('CI/CD Constitutional Tribunal'),
      }).toEqual({
        name,
        core: true,
      });
    }
  });
});
