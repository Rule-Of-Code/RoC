import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { EnvironmentParityStandardsLaw } from '../../src/checkers/deployment-laws/environment-parity-standards';
import { ALL_ENHANCED_CONSTITUTIONAL_LAWS } from '../../src/data/enhanced-laws';
import { FileUtils } from '../../src/utils';
import { BuildEnvironmentAnalyzer } from '../../src/utils/deployment/build-environment-analyzer/build-environment-analyzer';
import { lawRequirementsMet } from '../../src/utils/law-requirements';

/**
 * #532. Environment detection was looked for in five fixed files
 * (src/main.ts, src/index.ts, src/app.ts, server.ts, index.js). A project
 * that reads process.env in a config module, with its entry point at
 * src/cli.ts, was told "No proper environment detection found".
 */
describe('Environment Parity Standards finds environment detection where the code reads it', () => {
  const NO_DETECTION = 'No proper environment detection found';
  const roots: string[] = [];
  afterAll(() =>
    roots.forEach(r => fs.rmSync(r, { recursive: true, force: true }))
  );

  const project = (files: Record<string, string>): string => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-532-'));
    roots.push(root);
    const all: Record<string, string> = {
      'package.json': JSON.stringify({
        name: 'tool',
        version: '1.0.0',
        bin: { tool: 'dist/cli.js' },
        scripts: { build: 'tsc', test: 'jest' },
      }),
      ...files,
    };
    for (const [rel, text] of Object.entries(all)) {
      fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
      fs.writeFileSync(path.join(root, rel), text);
    }
    return root;
  };

  const detect = (root: string) =>
    BuildEnvironmentAnalyzer.checkEnvironmentDetection(
      root,
      FileUtils.getMinimalDefaultConfig()
    );

  it('an environment read in src/config/env.ts counts', () => {
    const root = project({
      'src/config/env.ts':
        "export const isProduction = process.env.NODE_ENV === 'production';\n",
      'src/cli.ts':
        "import { isProduction } from './config/env';\n\nconsole.log(isProduction);\n",
    });

    expect(detect(root).violations).not.toContain(NO_DETECTION);
  });

  it('an environment read in a workspace app entry counts', () => {
    const root = project({
      'apps/api/src/main.ts':
        'const port = Number(process.env.PORT ?? 3000);\nconsole.log(port);\n',
    });

    expect(detect(root).violations).not.toContain(NO_DETECTION);
  });

  it('a read only in a test file does not count', () => {
    const root = project({
      'src/cli.ts': "console.log('hello');\n",
      'src/cli.test.ts': "process.env.NODE_ENV = 'test';\n",
    });

    expect(detect(root).violations).toContain(NO_DETECTION);
  });

  it('a project that reads the environment nowhere is still reported', () => {
    const root = project({ 'src/cli.ts': "console.log('hello');\n" });

    expect(detect(root).violations).toContain(NO_DETECTION);
  });

  // The law is selected only for a production subject (#428). A service is
  // one, so the fixed-file lookup still mattered for it after that gate.
  it('the law judges a service that reads its environment in a config module', () => {
    const root = project({
      'package.json': JSON.stringify({
        name: 'svc',
        version: '1.0.0',
        dependencies: { express: '^4.0.0' },
        scripts: { build: 'tsc', test: 'jest' },
      }),
      'src/config/env.ts':
        'export const port = Number(process.env.PORT ?? 3000);\n',
      'src/server.ts':
        "import express from 'express';\nimport { port } from './config/env';\n\nexpress().listen(port);\n",
    });
    const law = ALL_ENHANCED_CONSTITUTIONAL_LAWS.find(
      l => l.title === 'Environment Parity Standards'
    );

    expect(lawRequirementsMet(law?.requires, root)).toBe(true);
    const result = EnvironmentParityStandardsLaw.check({
      projectRoot: root,
      config: FileUtils.getMinimalDefaultConfig(),
    });
    expect(result.violations).not.toContain(NO_DETECTION);
  });
});
