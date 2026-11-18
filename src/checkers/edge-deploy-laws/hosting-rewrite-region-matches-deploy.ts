/**
 * Hosting Rewrite Region Matches Deploy
 *
 * A hosting rewrite to a serverless service carries the region it sends
 * traffic to. When the service is deployed (or moved) to another region,
 * the rewrite keeps going to the old one — silently, while the old service
 * still answers. The rewrites and deploy forms read are a registry
 * (utils/edge-deploy/rewrite-region).
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { gateFiles } from '../../utils/edge-deploy/gate-files';
import { REQUIRES_HOSTING_RUN_REWRITE } from '../../utils/edge-deploy/requirements';
import {
  cloudRunDeploys,
  type DeployTarget,
  firebaseRunRewrites,
  type RewriteTarget,
  runAppUrlRewrites,
} from '../../utils/edge-deploy/rewrite-region';
import { EdgeDeployLawBase, newTally, type Tally } from './edge-deploy-law-base';

type Deploy = DeployTarget & { rel: string };

const where = (deploy: Deploy): string => `${deploy.region} (${deploy.rel}:${deploy.line})`;

export class HostingRewriteRegionMatchesDeployLaw extends EdgeDeployLawBase {
  static readonly LAW_NAME = 'Hosting Rewrite Region Matches Deploy';

  static check(context: LawCheckContext): LawResult {
    const tally = newTally();
    // Both halves of the gate are read: the rewrites, and the deploys that selected it with them.
    const files = gateFiles(context, { anyFileContaining: REQUIRES_HOSTING_RUN_REWRITE.anyFileContaining });
    const evidence = gateFiles(context, { anyOf: REQUIRES_HOSTING_RUN_REWRITE.anyOf });
    const deploys: Deploy[] = evidence.flatMap(file => cloudRunDeploys(file.rel, file.content).map(deploy => ({ ...deploy, rel: file.rel })));
    let rewrites = 0;
    for (const file of files) {
      const targets = file.rel.endsWith('firebase.json') ? firebaseRunRewrites(file.content) : runAppUrlRewrites(file.content);
      if (!targets) {
        tally.notes.push(`${file.rel}: could not be parsed as JSON — not judged`);
        continue;
      }
      rewrites += targets.length;
      for (const target of targets) this.judge(`${file.rel}:${target.line}`, target, deploys, tally);
    }
    return this.conclude(context, {
      name: this.LAW_NAME,
      category: 'DEPLOYMENT',
      tally,
      filesRead: files.length,
      subject: 'a hosting rewrite to a serverless service in a region',
      unit: 'rewrite(s) compared with the deploy configuration',
      notSeen: 'deploy configuration in another repository, Terraform/Pulumi, gcloud config set run/region, regions chosen in a console',
      recommendations: [
        'Keep the rewrite region and the deploy region in one place (a shared variable or a check in the deploy pipeline)',
        'When a service moves region, change the hosting rewrite in the same release and retire the old service',
      ],
      metrics: { rewrites, deployCommandsRead: deploys.length },
    });
  }

  private static judge(at: string, target: RewriteTarget, deploys: Deploy[], tally: Tally): void {
    const region = target.defaulted ? `${target.region} (the default when region is omitted)` : target.region;
    const forService = deploys.filter(deploy => deploy.service === target.service);
    const known = forService.filter(deploy => deploy.region !== null);
    if (known.length > 0) {
      tally.judged++;
      if (known.some(deploy => deploy.region === target.region)) return;
      tally.findings.push(
        `${at}: the rewrite sends traffic to service ${target.service} in ${region}, but the repository deploys ${target.service} to ${known.map(where).join(', ')} — the rewrite keeps reaching the old region while a service there still answers`
      );
      return;
    }
    if (forService.length > 0) {
      tally.notes.push(`${at}: ${target.service} is deployed at ${forService.map(deploy => `${deploy.rel}:${deploy.line}`).join(', ')} with a region that could not be read — not judged`);
      return;
    }
    const regions = deploys.filter(deploy => deploy.region !== null);
    if (regions.length === 0) {
      tally.notes.push(`${at}: no deploy configuration in this repository names a region for ${target.service} or any other service — not judged (another repository is not read)`);
      return;
    }
    tally.judged++;
    if (regions.some(deploy => deploy.region === target.region)) return;
    tally.findings.push(
      `${at}: the rewrite sends traffic to service ${target.service} in ${region}, a region that appears in no deploy configuration of this repository (it deploys to ${regions.map(where).join(', ')}) — check where ${target.service} runs now`
    );
  }
}
