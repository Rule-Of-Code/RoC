/**
 * Job Definition Dumps Masked
 *
 * `gcloud scheduler jobs describe` (and list --format=json) print a job's
 * HTTP headers verbatim. When a job sends a shared secret in a header, a
 * script that saves that output to a file, a log or the CI job log leaks
 * the secret. The commands and what counts as masking are a registry
 * (utils/edge-deploy/definition-dumps).
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { type DumpVerdict, pythonDumps, shellDumps } from '../../utils/edge-deploy/definition-dumps';
import { gateFiles } from '../../utils/edge-deploy/gate-files';
import { REQUIRES_DEFINITION_DUMP } from '../../utils/edge-deploy/requirements';
import { EdgeDeployLawBase, newTally, type Tally } from './edge-deploy-law-base';

export class JobDefinitionDumpsMaskedLaw extends EdgeDeployLawBase {
  static readonly LAW_NAME = 'Job Definition Dumps Masked';

  static check(context: LawCheckContext): LawResult {
    const tally = newTally();
    const files = gateFiles(context, REQUIRES_DEFINITION_DUMP);
    let commands = 0;
    for (const file of files) {
      const verdicts = file.rel.endsWith('.py') ? pythonDumps(file.content) : shellDumps(file.rel, file.content);
      commands += verdicts.length;
      for (const verdict of verdicts) this.judge(file.rel, verdict, tally);
    }
    return this.conclude(context, {
      name: this.LAW_NAME,
      category: 'SECURITY',
      tally,
      filesRead: files.length,
      subject: 'a command that prints a job or scheduler definition',
      unit: 'definition dump command(s) judged',
      notSeen: 'output captured into a variable and written later, cloud SDK clients (google-cloud-scheduler, boto3, azure-mgmt), commands built from strings at run time',
      recommendations: [
        "Delete the secret fields before writing: gcloud scheduler jobs list --format=json | jq 'del(.[].httpTarget.headers)' > jobs.json",
        'Or print only what you need: --format="value(name,schedule,state)" / --query, or run the output through a mask/redact helper before it reaches a file or a log',
      ],
      metrics: { dumpCommands: commands },
    });
  }

  private static judge(rel: string, verdict: DumpVerdict, tally: Tally): void {
    if (verdict.verdict === 'unread') {
      tally.notes.push(`${rel}:${verdict.line}: ${verdict.command} — ${verdict.detail}, not judged`);
      return;
    }
    tally.judged++;
    if (verdict.verdict !== 'leaks') return;
    tally.findings.push(
      `${rel}:${verdict.line}: ${verdict.command} prints the whole definition — header values and environment included — and it is ${verdict.detail} without a masking step; a secret sent in a job header ends up in plain text`
    );
  }
}
