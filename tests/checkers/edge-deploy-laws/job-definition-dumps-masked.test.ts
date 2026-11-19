/**
 * #366 — a script that saves a scheduler / job definition writes its
 * secret headers in plain text unless it masks them first.
 */
import { JobDefinitionDumpsMaskedLaw } from '../../../src/checkers/edge-deploy-laws/job-definition-dumps-masked';
import { EDGE_DEPLOY_SECURITY_LAWS } from '../../../src/data/edge-deploy-security-laws';
import { lawRequirementsMet } from '../../../src/utils/law-requirements';
import { repo } from '../../utils/git-fixture';
import { ctx, project, removeProjects } from '../toolkit-fixture';

afterAll(removeProjects);

const LAW = EDGE_DEPLOY_SECURITY_LAWS.find(
  law => law.checkFunction === 'JobDefinitionDumpsMaskedLaw.check'
);
const check = (files: Record<string, string>) =>
  JobDefinitionDumpsMaskedLaw.check(ctx(project(files)));
const one = (script: string, name = 'scripts/jobs.sh') =>
  check({ [name]: script });

describe('#366 Job Definition Dumps Masked — acceptance', () => {
  it('red: gcloud scheduler jobs list --format=json > out.json', () => {
    const result = one(
      '#!/bin/sh\ngcloud scheduler jobs list --location europe-west3 --format=json > out.json\n'
    );
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      expect.stringMatching(
        /^scripts\/jobs\.sh:2: gcloud scheduler jobs list prints the whole definition .* written to out\.json/
      ),
    ]);
  });

  it("green: | jq 'del(.[].httpTarget.headers)' before the file", () => {
    const result = one(
      "gcloud scheduler jobs list --format=json | jq 'del(.[].httpTarget.headers)' > out.json\n"
    );
    expect(result.passed).toBe(true);
    expect(result.message).toMatch(
      /1 definition dump command\(s\) judged in 1 file\(s\)/
    );
  });

  it('green: a redact helper in the pipeline, or run later on the file', () => {
    expect(
      one(
        'gcloud scheduler jobs describe sync --format=json | redact_headers > job.json\n'
      ).passed
    ).toBe(true);
    expect(
      one(
        'gcloud scheduler jobs describe sync > job.yaml\nmask_secrets job.yaml\n'
      ).passed
    ).toBe(true);
  });
});

describe('#366 — the registry', () => {
  it.each([
    [
      'describe (default YAML) to a file',
      'gcloud scheduler jobs describe nightly --location x > job.yaml\n',
    ],
    [
      'tee',
      'gcloud beta scheduler jobs describe nightly --format=yaml | tee job.yaml\n',
    ],
    [
      'run jobs describe',
      'gcloud run jobs describe migrate --region x --format=json >> evidence.log\n',
    ],
    [
      'functions describe',
      'gcloud functions describe f --format yaml > f.yaml\n',
    ],
    [
      'aws targets (JSON by default)',
      'aws events list-targets-by-rule --rule nightly > targets.json\n',
    ],
    [
      'az app settings',
      'az functionapp config appsettings list -g rg -n app | Out-File settings.json\n',
    ],
  ])('red: %s', (_name, script) => {
    expect(one(script).violations).toHaveLength(1);
  });

  it.each([
    [
      'list without --format prints a table without headers',
      'gcloud scheduler jobs list --location x > jobs.txt\n',
    ],
    [
      'a value() projection',
      'gcloud scheduler jobs list --format="value(name,state)" > jobs.txt\n',
    ],
    [
      'an aws --query that names no header',
      "aws events list-targets-by-rule --rule r --query 'Targets[].Arn' > arns.txt\n",
    ],
    [
      'printed to the terminal in a script',
      'gcloud scheduler jobs describe nightly\n',
    ],
  ])('green: %s', (_name, script) => {
    expect(one(script).passed).toBe(true);
  });

  it('a command in an if condition is read: to a file is red, to /dev/null is green', () => {
    expect(
      one(
        'if gcloud scheduler jobs describe j --format=json > j.json; then echo ok; fi\n'
      ).violations
    ).toHaveLength(1);
    const result = one(
      'if gcloud scheduler jobs describe "$j" \\\n    --location x >/dev/null 2>&1; then\n  echo exists\nfi\n'
    );
    expect(result.passed).toBe(true);
    expect(result.metrics).toMatchObject({ judged: 1 });
  });

  it('an indented if inside a function is read too', () => {
    const script =
      'snap() {\n    if gcloud scheduler jobs describe j --format=json > j.json; then\n        echo ok\n    fi\n}\n';
    expect(one(script).violations).toEqual([
      expect.stringMatching(/^scripts\/jobs\.sh:2:/),
    ]);
  });

  it('red: unpiped in a CI workflow, into the job log', () => {
    const yml =
      'jobs:\n  a:\n    steps:\n      - run: gcloud scheduler jobs describe nightly --location x\n';
    expect(one(yml, '.github/workflows/audit.yml').violations).toEqual([
      expect.stringContaining('printed into the CI job log'),
    ]);
  });

  it('a jq projection or a $(…) capture is listed as not judged — a pass with the counter, never "judged nothing"', () => {
    const result = one(
      "gcloud scheduler jobs list --format=json | jq '.[].name' > names.txt\nOUT=$(gcloud scheduler jobs describe n)\n"
    );
    expect(result.passed).toBe(true);
    expect(result.judgedNothing).not.toBe(true);
    expect(result.message).toMatch(
      /1 file\(s\) read, 0 definition dump command\(s\) judged; 2 case\(s\) not judged/
    );
    expect(result.metrics).toMatchObject({
      filesRead: 1,
      judged: 0,
      notJudged: 2,
    });
    const notes = result.suggestions?.join(' ') ?? '';
    expect(notes).toMatch(
      /jobs\.sh:1: .*a jq\/yq filter whose output is not evaluated/
    );
    expect(notes).toMatch(/jobs\.sh:2: .*captured into a variable/);
  });
});

describe('#366 — Python', () => {
  const RED = [
    'import json, subprocess',
    'out = subprocess.run(["gcloud", "scheduler", "jobs", "list",',
    '                      "--format=json"], capture_output=True, text=True).stdout',
    'with open("evidence/jobs.json", "w") as f:',
    '    f.write(out)',
    '',
  ].join('\n');

  it('red: a list-form command whose output the script writes', () => {
    expect(check({ 'tools/move.py': RED }).violations).toEqual([
      expect.stringMatching(/^tools\/move\.py:2: gcloud scheduler jobs list/),
    ]);
  });

  it('green: the headers are deleted before the write', () => {
    const py = RED.replace(
      'with open',
      'jobs = json.loads(out)\nfor job in jobs:\n    job.get("httpTarget", {}).pop("headers", None)\nwith open'
    );
    expect(check({ 'tools/move.py': py }).passed).toBe(true);
  });
});

describe('#366 — selection is the subject', () => {
  it('scripts without a registry command, and a command in a comment, do not select the law', () => {
    expect(
      lawRequirementsMet(
        LAW?.requires,
        project({
          'scripts/a.sh':
            'gcloud scheduler jobs create http j --schedule "* * * * *"\n# gcloud scheduler jobs describe j > x\n',
        })
      )
    ).toBe(false);
  });

  it('an untracked script selects and is judged; a git-ignored one selects nothing', () => {
    const files = {
      'scripts/jobs.sh': 'gcloud scheduler jobs describe j > j.yaml\n',
      'README.md': '#\n',
    };
    const untracked = repo(files, ['README.md']);
    expect(lawRequirementsMet(LAW?.requires, untracked)).toBe(true);
    expect(
      JobDefinitionDumpsMaskedLaw.check(ctx(untracked)).violations
    ).toHaveLength(1);
    const ignored = repo({ ...files, '.gitignore': 'scripts/\n' }, [
      'README.md',
      '.gitignore',
    ]);
    expect(lawRequirementsMet(LAW?.requires, ignored)).toBe(false);
  });

  it('ignores.global and test trees leave the script out of the gate', () => {
    expect(
      lawRequirementsMet(
        LAW?.requires,
        project({ 'legacy/jobs.sh': 'gcloud scheduler jobs describe j > j\n' }),
        ['legacy/**']
      )
    ).toBe(false);
    expect(
      lawRequirementsMet(
        LAW?.requires,
        project({ 'tests/jobs.sh': 'gcloud scheduler jobs describe j > j\n' })
      )
    ).toBe(false);
  });

  it('no file read → judged nothing', () => {
    expect(check({ 'README.md': '#\n' }).judgedNothing).toBe(true);
  });
});
