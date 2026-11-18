/**
 * Serverless Deploy Pins Resources (#357): deploy commands and definitions
 * that leave cpu / memory / concurrency / timeout / the instance cap to the
 * platform defaults, per platform in the registry.
 */
import { ServerlessDeployPinsResourcesLaw as Law } from '../../../src/checkers/client-deploy-laws/serverless-deploy-pins-resources';
import { argsCommands, commandsInText, opaqueArguments } from '../../../src/utils/deployment/deploy-commands';
import { CLOUD_RUN_DEPLOY } from '../../../src/utils/deployment/serverless-platforms';
import { yamlEntries } from '../../../src/utils/deployment/yaml-lines';
import { ctx, project, removeProjects } from '../toolkit-fixture';

afterAll(removeProjects);

const run = (files: Record<string, string>) => Law.check(ctx(project(files)));

const ALL_FLAGS = '--cpu=1 --memory=512Mi --concurrency=80 --timeout=60 --max-instances=10';

const workflow = (deploy: string): string =>
  [
    'name: release',
    'on: push',
    'jobs:',
    '  deploy:',
    '    runs-on: ubuntu-latest',
    '    steps:',
    '      - uses: actions/checkout@v4',
    '      - name: Deploy',
    '        run: |',
    ...deploy.split('\n').map(line => `          ${line}`),
  ].join('\n');

describe('ServerlessDeployPinsResourcesLaw', () => {
  it('red: a build step without the flags — one finding at the command listing every missing one', () => {
    const result = run({
      '.github/workflows/release.yml': workflow('gcloud run deploy api \\\n  --image "$IMAGE" \\\n  --region europe-west1'),
    });
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      expect.stringMatching(
        /^\.github\/workflows\/release\.yml:10: gcloud run deploy leaves cpu \(--cpu\), memory \(--memory\), concurrency \(--concurrency\), timeout \(--timeout\), max instances \(--max-instances\) to the platform defaults/
      ),
    ]);
  });

  it('green: the same step with every flag', () => {
    const result = run({
      '.github/workflows/release.yml': workflow(`gcloud run deploy api \\\n  --image "$IMAGE" \\\n  ${ALL_FLAGS.split(' ').join(' \\\n  ')}`),
    });
    expect(result.violations).toEqual([]);
    expect(result.passed).toBe(true);
  });

  it('red: only the flags that are missing are listed; a following && command does not lend its flags', () => {
    const result = run({
      'scripts/deploy.sh': `#!/bin/sh\ngcloud beta run deploy api --cpu 2 --memory 1Gi --region x && gcloud run services update-traffic api --timeout 5 --max-instances 3\n`,
    });
    expect(result.violations).toHaveLength(1);
    expect(result.violations?.[0]).toMatch(/^scripts\/deploy\.sh:2: gcloud run deploy leaves concurrency \(--concurrency\), timeout \(--timeout\), max instances \(--max-instances\) to/);
  });

  it('Cloud Build: entrypoint gcloud + args list (flow and block forms)', () => {
    const flow = [
      'steps:',
      "  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'",
      '    entrypoint: gcloud',
      "    args: ['run', 'deploy', 'api', '--image', 'img',",
      "           '--region', 'europe-west1']",
    ].join('\n');
    expect(run({ 'cloudbuild.yaml': flow }).violations).toEqual([expect.stringMatching(/^cloudbuild\.yaml:4: gcloud run deploy leaves cpu/)]);
    const block = ['steps:', '- name: gcr.io/cloud-builders/gcloud', '  args:', '  - run', '  - deploy', '  - api', ...ALL_FLAGS.split(' ').map(f => `  - ${f}`)].join('\n');
    expect(run({ 'cloudbuild.yaml': block }).violations).toEqual([]);
  });

  it('gcloud run services replace: the service YAML keys count', () => {
    const service = [
      'apiVersion: serving.knative.dev/v1',
      'kind: Service',
      'metadata:',
      '  name: api',
      'spec:',
      '  template:',
      '    metadata:',
      '      annotations:',
      "        autoscaling.knative.dev/maxScale: '10'",
      '    spec:',
      '      containerConcurrency: 80',
      '      containers:',
      '        - image: img',
      '          startupProbe:',
      '            timeoutSeconds: 3',
      '          resources:',
      '            limits:',
      '              cpu: 1000m',
      '              memory: 512Mi',
    ].join('\n');
    const result = run({ 'deploy/service.yaml': service, 'Makefile': 'deploy:\n\tgcloud run services replace deploy/service.yaml --region x\n' });
    expect(result.violations).toEqual([
      expect.stringMatching(/^Makefile:2: gcloud run services replace deploy\/service\.yaml leaves timeout \(template\.spec\.timeoutSeconds\) to/),
    ]);
  });

  it('AWS: create-function flags, SAM resources with Globals.Function, serverless.yml provider fallback', () => {
    const sam = [
      'Transform: AWS::Serverless-2016-10-31',
      'Globals:',
      '  Function:',
      '    Timeout: 10',
      'Resources:',
      '  Api:',
      '    Type: AWS::Serverless::Function',
      '    Properties:',
      '      MemorySize: 512',
      '  Worker:',
      '    Type: AWS::Serverless::Function',
      '    Properties:',
      '      Handler: worker.handler',
    ].join('\n');
    const serverless = ['service: svc', 'provider:', '  name: aws', '  timeout: 10', 'functions:', '  hello:', '    handler: h.hello', '    memorySize: 256', '  bye:', '    handler: h.bye'].join('\n');
    const result = run({
      'template.yaml': sam,
      'serverless.yml': serverless,
      'package.json': JSON.stringify({ name: 'x', scripts: { create: 'aws lambda create-function --function-name f --memory-size 256 --role r' } }, null, 2),
    });
    expect(result.violations).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^template\.yaml:10: function Worker \(AWS::Serverless::Function\) leaves memory \(MemorySize\) to/),
        expect.stringMatching(/^serverless\.yml:9: function bye leaves memory \(provider\.memorySize \/ functions\.bye\.memorySize\) to/),
        expect.stringMatching(/^package\.json:4: aws lambda create-function leaves timeout \(--timeout\) to/),
      ])
    );
    expect(result.violations).toHaveLength(3);
  });

  it('Azure: Flex Consumption create flags, and host.json functionTimeout; a Consumption-plan create is not judged', () => {
    const result = run({
      'scripts/azure.ps1': 'az functionapp create -g rg -n app -s st `\n  --flexconsumption-location northeurope --runtime python --instance-memory 2048\naz functionapp create -g rg -n other -s st --consumption-plan-location westus\n',
      'host.json': JSON.stringify({ version: '2.0', logging: {} }, null, 2),
    });
    expect(result.violations).toEqual([
      expect.stringMatching(/^host\.json:2: function app leaves timeout \(functionTimeout\) to/),
      expect.stringMatching(/^scripts\/azure\.ps1:1: az functionapp create \(Flex Consumption\) leaves max instances \(--maximum-instance-count\) to/),
    ]);
  });

  it('the Cloud Run deploy action: flags and timeout inputs', () => {
    const step = (inputs: string) =>
      ['jobs:', '  d:', '    steps:', '      - uses: google-github-actions/deploy-cloudrun@v2', '        with:', '          service: api', ...inputs.split('\n').map(l => `          ${l}`)].join('\n');
    expect(run({ '.github/workflows/d.yml': step("flags: '--cpu=1 --memory=512Mi'") }).violations).toEqual([
      expect.stringMatching(/^\.github\/workflows\/d\.yml:4: google-github-actions\/deploy-cloudrun \(flags input\) leaves concurrency .*timeout .*max instances/),
    ]);
    expect(run({ '.github/workflows/d.yml': step("timeout: 60s\nflags: >-\n  --cpu=1 --memory=512Mi\n  --concurrency=80 --max-instances=10") }).violations).toEqual([]);
  });

  it('not judged, but said: a whole-argument expansion where flags could be', () => {
    const result = run({ 'scripts/deploy.sh': 'gcloud run deploy "$SERVICE" --image "$IMAGE" $EXTRA_FLAGS\n' });
    expect(result.judgedNothing).toBe(true);
    expect(result.suggestions).toEqual(expect.arrayContaining([expect.stringContaining('scripts/deploy.sh:1: gcloud run deploy passes $EXTRA_FLAGS, which may carry cpu')]));
  });

  it('judged nothing: no serverless deploy anywhere', () => {
    const result = run({ '.github/workflows/ci.yml': workflow('npm test'), 'scripts/build.sh': 'npm run build\n' });
    expect(result.judgedNothing).toBe(true);
    expect(result.passed).toBe(false);
    expect(result.score).toBe(0);
  });
});

describe('deploy command reading', () => {
  it('joins continuation lines, folded scalars and flag lines; stops at shell operators', () => {
    expect(commandsInText('gcloud run deploy a \\\n --cpu 1 \\\n --memory 2; echo --timeout', CLOUD_RUN_DEPLOY.start)[0]?.text.replace(/\s+/g, ' ')).toBe('gcloud run deploy a --cpu 1 --memory 2');
    const folded = 'run: >\n  gcloud run deploy a\n  --image x\n  img2\n  --cpu 1\nnext: 1';
    const entries = yamlEntries(folded);
    const lines = new Set(entries.filter(e => e.folded).flatMap(e => e.block.map(l => l.line - 1)));
    expect(commandsInText(folded, CLOUD_RUN_DEPLOY.start, lines)[0]?.text).toContain('--cpu 1');
  });

  it('a mention in prose or a comment is not a command; a quoted -c script is', () => {
    const start = CLOUD_RUN_DEPLOY.start;
    expect(commandsInText('# gcloud run deploy api', start)).toEqual([]);
    expect(commandsInText('fail "a release without them is the bare \'gcloud run deploy\' this script prevents"', start)).toEqual([]);
    expect(commandsInText('echo "Running gcloud run deploy now"', start)).toEqual([]);
    expect(commandsInText("args: ['-c', 'gcloud run deploy api --cpu 1']", start)).toHaveLength(1);
    expect(commandsInText('deploy:\n\t@gcloud run deploy api', start)).toHaveLength(1);
    expect(commandsInText('test -n "$X" && CLOUDSDK_CORE_DISABLE_PROMPTS=1 gcloud run deploy api', start)).toHaveLength(1);
  });

  it('the service name positional and flag values are not opaque; a bare expansion elsewhere is', () => {
    expect(opaqueArguments('gcloud run deploy $SVC --image $IMG --region ${{ env.R }}', 3, 1)).toEqual([]);
    expect(opaqueArguments('gcloud run deploy $SVC --image $IMG ${{ inputs.flags }}', 3, 1)).toEqual(['$GHA']);
  });

  it('args of a step without a gcloud entrypoint are not a command', () => {
    expect(argsCommands(yamlEntries('steps:\n- name: node\n  args: [run, deploy]'))).toEqual([]);
  });
});
