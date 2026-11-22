/**
 * Shared by the #29 and #491 regression tests: one throwaway project, judged
 * by the two laws that ask whether a test reaches outside its process
 * without a double — Unit Test Quality and Test Data Management.
 */
import { UnitTestQualityLaw } from '../../src/checkers/testing-laws/unit-test-quality';
import { TestDataManagementLaw } from '../../src/laws/testing/test-data-management';
import { FileUtils } from '../../src/utils/file-utils';
import { project } from '../checkers/toolkit-fixture';

/** Unit Test Quality's mocking findings. */
const UTQ_MOCKING = /no mocking detected|HTTP calls should be mocked/;
/** Test Data Management's mocking finding. */
const TDM_MOCKING = /import external clients and no test uses a test double/;

export interface BoundaryVerdict {
  unitTestQuality: boolean;
  testDataManagement: boolean;
}

/** Whether each law asks for a double in a project made of `files`. */
export async function mockingVerdict(
  files: Record<string, string[]>
): Promise<BoundaryVerdict> {
  const root = project({
    'package.json': JSON.stringify({ name: 'fixture', version: '1.0.0' }),
    ...Object.fromEntries(
      Object.entries(files).map(([name, lines]) => [
        name,
        [...lines, ''].join('\n'),
      ])
    ),
  });
  const config = FileUtils.getMinimalDefaultConfig();
  const utq = await UnitTestQualityLaw.check({
    projectRoot: root,
    config,
    lawId: 'unit-test-quality-standards',
  });
  const tdm = TestDataManagementLaw.check({ projectRoot: root, config });
  return {
    unitTestQuality: (utq.violations ?? []).some(v => UTQ_MOCKING.test(v)),
    testDataManagement: (tdm.violations ?? []).some(v => TDM_MOCKING.test(v)),
  };
}
