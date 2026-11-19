/**
 * TracingExplainsLatency (#358): OpenTelemetry installed and exporting, yet
 * unable to explain a slow request — the default sampler follows a caller
 * that samples few requests, and the database client has no spans. Each
 * finding names the setup file or the manifest line of the client.
 */
import { TracingExplainsLatencyLaw } from '../../../src/checkers/measurement-laws/tracing-explains-latency';
import { MEASUREMENT_LAWS } from '../../../src/data/measurement-laws';
import { lawRequirementsMet } from '../../../src/utils/law-requirements';
import { ctx, manifest, project, removeProjects } from '../toolkit-fixture';

afterAll(removeProjects);

const LAW = MEASUREMENT_LAWS.find(
  law => law.checkFunction === 'TracingExplainsLatencyLaw.check'
);
const run = (files: Record<string, string>) =>
  TracingExplainsLatencyLaw.check(ctx(project(files)));

const REQUIREMENTS = `fastapi==0.115.0
google-cloud-firestore==2.19.0
opentelemetry-sdk==1.27.0
opentelemetry-exporter-otlp==1.27.0
`;
const SETUP_DEFAULT = `from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

provider = TracerProvider()
provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
trace.set_tracer_provider(provider)
`;
const SETUP_SAMPLED = SETUP_DEFAULT.replace(
  'provider = TracerProvider()',
  'from opentelemetry.sdk.trace.sampling import ParentBased, TraceIdRatioBased\n' +
    'from opentelemetry.instrumentation.grpc import GrpcInstrumentorClient\n' +
    'GrpcInstrumentorClient().instrument()\n' +
    'provider = TracerProvider(sampler=ParentBased(root=TraceIdRatioBased(0.5)))'
);

describe('TracingExplainsLatencyLaw (#358)', () => {
  it('is selected where a Python or a Node OpenTelemetry SDK is declared, and nowhere else', () => {
    expect(
      lawRequirementsMet(
        LAW?.requires,
        project({ 'requirements.txt': 'opentelemetry-sdk\n' })
      )
    ).toBe(true);
    expect(
      lawRequirementsMet(
        LAW?.requires,
        project({
          'package.json': manifest({ '@opentelemetry/sdk-node': '0.200.0' }),
        })
      )
    ).toBe(true);
    expect(
      lawRequirementsMet(
        LAW?.requires,
        project({
          'requirements.txt': 'fastapi\n',
          'package.json': manifest({}),
        })
      )
    ).toBe(false);
  });

  it('red: SDK + exporter, no sampler and no database instrumentation — two findings, each at its place', () => {
    const result = run({
      'service/requirements.txt': REQUIREMENTS,
      'service/app/telemetry.py': SETUP_DEFAULT,
    });
    expect(result.passed).toBe(false);
    expect(result.violations).toHaveLength(2);
    expect(result.violations).toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^service\/app\/telemetry\.py:6: sets up OpenTelemetry tracing without choosing a sampler/
        ),
        expect.stringMatching(
          /^service\/requirements\.txt:2: google-cloud-firestore is a dependency, but no OpenTelemetry instrumentation .*opentelemetry-instrumentation-grpc/
        ),
      ])
    );
  });

  it('green: an explicit sampler and the gRPC client instrumentation', () => {
    const result = run({
      'service/requirements.txt': `${REQUIREMENTS}opentelemetry-instrumentation-grpc==0.48b0\n`,
      'service/app/telemetry.py': SETUP_SAMPLED,
    });
    expect(result.violations).toEqual([]);
    expect(result.passed).toBe(true);
  });

  it('OTEL_TRACES_SAMPLER in a deploy file chooses the sampler for a zero-code setup', () => {
    const files = {
      'requirements.txt':
        'opentelemetry-distro\nopentelemetry-instrumentation-grpc\ngoogle-cloud-firestore\n',
      Dockerfile:
        'FROM python:3.12\nCMD ["opentelemetry-instrument", "uvicorn", "app:app"]\n',
    };
    expect(run(files).violations).toEqual([
      expect.stringMatching(
        /^Dockerfile:2: sets up OpenTelemetry tracing without/
      ),
    ]);
    const deploy =
      'spec:\n  containers:\n    - env:\n        - name: OTEL_TRACES_SAMPLER\n          value: parentbased_traceidratio\n';
    expect(run({ ...files, 'deploy/service.yaml': deploy }).violations).toEqual(
      []
    );
  });

  it('opentelemetry-bootstrap installs the instrumentation of every installed client', () => {
    const result = run({
      'requirements.txt': 'opentelemetry-distro\npsycopg2-binary\nredis\n',
      Dockerfile:
        'RUN opentelemetry-bootstrap -a install\nENV OTEL_TRACES_SAMPLER always_on\n',
    });
    expect(result.violations).toEqual([]);
  });

  it('Node: NodeSDK without a sampler and pg without instrumentation; auto-instrumentations covers pg', () => {
    const files = {
      'package.json': JSON.stringify(
        {
          name: 'api',
          dependencies: { '@opentelemetry/sdk-node': '0.200.0', pg: '8.13.0' },
        },
        null,
        2
      ),
      'src/tracing.ts':
        "import { NodeSDK } from '@opentelemetry/sdk-node';\nconst sdk = new NodeSDK({});\nsdk.start();\n",
    };
    const red = run(files).violations ?? [];
    expect(red).toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^src\/tracing\.ts:2: sets up OpenTelemetry tracing without choosing a sampler/
        ),
        expect.stringMatching(
          /^package\.json:5: pg is a dependency, but no OpenTelemetry instrumentation/
        ),
      ])
    );
    const green = run({
      ...files,
      'package.json': manifest({
        '@opentelemetry/sdk-node': '0.200.0',
        '@opentelemetry/auto-instrumentations-node': '0.50.0',
        pg: '8.13.0',
      }),
      'src/tracing.ts': files['src/tracing.ts'].replace(
        '{}',
        '{ sampler: new TraceIdRatioBasedSampler(0.2) }'
      ),
    });
    expect(green.violations).toEqual([]);
  });

  it('an SDK with no setup file and no OTEL_TRACES_SAMPLER is named at the manifest that declares it', () => {
    const result = run({ 'requirements.txt': 'opentelemetry-sdk\n' });
    expect(result.violations).toEqual([
      expect.stringMatching(
        /^requirements\.txt:1: declares an OpenTelemetry SDK, but no setup file chooses a sampler/
      ),
    ]);
  });

  it('a TracerProvider built in a test is not the service setup', () => {
    const result = run({
      'requirements.txt': 'opentelemetry-sdk\n',
      'app/telemetry.py': 'provider = TracerProvider(sampler=ALWAYS_ON)\n',
      'tests/test_spans.py': 'provider = TracerProvider()\n',
    });
    expect(result.violations).toEqual([]);
  });
});
