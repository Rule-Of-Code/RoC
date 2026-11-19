/**
 * `requires.anyPythonDependency`: a law about a Python library is selected
 * only where a Python manifest declares it. Each manifest format is read in
 * both directions, names compare in PEP 503 form, and a service in a
 * subdirectory is found.
 */
import {
  describeRequirement,
  lawRequirementsMet,
} from '../../src/utils/law-requirements';
import {
  declaredPythonDependencies,
  normalizePythonName,
  requirementName,
} from '../../src/utils/python-dependencies';
import { project, removeProjects } from '../checkers/toolkit-fixture';

afterAll(removeProjects);

const DOCSTORE = { anyPythonDependency: ['docstore-client', 'sqlalchemy'] };

describe('normalizePythonName / requirementName', () => {
  it('folds case and separator runs (PEP 503)', () => {
    expect(normalizePythonName('Docstore_Client.Async')).toBe(
      'docstore-client-async'
    );
  });
  it('reads the name before extras, markers and specifiers', () => {
    expect(
      requirementName('SQLAlchemy[asyncio]>=2.0 ; python_version>"3.9"')
    ).toBe('sqlalchemy');
    expect(
      requirementName('git+https://example.invalid/x.git#egg=Docstore_Client')
    ).toBe('docstore-client');
    expect(requirementName('  ')).toBeNull();
  });
});

describe('declaredPythonDependencies', () => {
  it('requirements.txt: skips comments, options and includes', () => {
    const root = project({
      'requirements.txt':
        '# db\nSQLAlchemy==2.0.1  # orm\n-r base.txt\n--index-url https://x.invalid\nhttpx\n',
    });
    expect([...declaredPythonDependencies(root)].sort()).toEqual([
      'httpx',
      'sqlalchemy',
    ]);
  });

  it('requirements/<env>.txt and an editable #egg= line', () => {
    const root = project({
      'requirements/dev.txt':
        '-e git+https://example.invalid/r.git#egg=docstore_client\n',
    });
    expect(declaredPythonDependencies(root).has('docstore-client')).toBe(true);
  });

  it('pyproject PEP 621 dependencies with extras containing brackets', () => {
    const root = project({
      'pyproject.toml': [
        '[project]',
        'name = "svc"',
        'dependencies = [',
        '  "web-framework[standard]>=1.0",  # a comment with ] in it',
        "  'Docstore-Client>=2',",
        ']',
        '[project.optional-dependencies]',
        'test = ["pytest"]',
        '[dependency-groups]',
        'lint = ["ruff"]',
      ].join('\n'),
    });
    const names = declaredPythonDependencies(root);
    for (const n of ['web-framework', 'docstore-client', 'pytest', 'ruff']) {
      expect(names.has(n)).toBe(true);
    }
    expect(names.has('svc')).toBe(false); // the project's own name is not a dependency
  });

  it('pyproject Poetry tables, including groups; python is not a package', () => {
    const root = project({
      'pyproject.toml': [
        '[tool.poetry.dependencies]',
        'python = "^3.12"',
        'docstore-client = { version = "^2", extras = ["async"] }',
        '[tool.poetry.group.dev.dependencies]',
        'pytest = "^8"',
      ].join('\n'),
    });
    expect([...declaredPythonDependencies(root)].sort()).toEqual([
      'docstore-client',
      'pytest',
    ]);
  });

  it('Pipfile, setup.cfg and setup.py', () => {
    const root = project({
      'a/Pipfile':
        '[packages]\nsqlalchemy = "*"\n[dev-packages]\npytest = "*"\n',
      'b/setup.cfg':
        '[options]\ninstall_requires =\n    httpx>=0.27\n    docstore-client\n',
      'c/setup.py':
        'setup(name="x", install_requires=["orm-lib>=1", "uvicorn[standard]"])',
    });
    const names = declaredPythonDependencies(root);
    for (const n of [
      'sqlalchemy',
      'pytest',
      'httpx',
      'docstore-client',
      'orm-lib',
      'uvicorn',
    ]) {
      expect(names.has(n)).toBe(true);
    }
  });

  it('ignores virtual environments and node_modules', () => {
    const root = project({
      '.venv/lib/requirements.txt': 'sqlalchemy\n',
      'node_modules/pkg/requirements.txt': 'sqlalchemy\n',
    });
    expect(declaredPythonDependencies(root).size).toBe(0);
  });
});

describe('lawRequirementsMet — anyPythonDependency', () => {
  it('a service in a subdirectory that declares the client meets it', () => {
    const root = project({
      'package.json': '{"name":"client"}',
      'services/api/pyproject.toml':
        '[project]\ndependencies = ["SQLAlchemy>=2"]\n',
    });
    expect(lawRequirementsMet(DOCSTORE, root)).toBe(true);
  });

  it('a Python project without the client does not meet it', () => {
    const root = project({ 'requirements.txt': 'httpx\n' });
    expect(lawRequirementsMet(DOCSTORE, root)).toBe(false);
  });

  it('the same name in package.json does not meet a Python requirement', () => {
    const root = project({
      'package.json': JSON.stringify({ dependencies: { sqlalchemy: '1' } }),
    });
    expect(lawRequirementsMet(DOCSTORE, root)).toBe(false);
  });

  it('is described for the redundant-waiver message', () => {
    expect(describeRequirement(DOCSTORE)).toBe(
      'a Python dependency on docstore-client or sqlalchemy'
    );
  });
});
