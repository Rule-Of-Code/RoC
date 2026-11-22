# Pre-Deployment Checklist — releasing `ruleofcode` to npm

A "deployment" of this repository is an npm release. These are the steps every
release goes through, in order. Leave the boxes unticked here: they are ticked
for one release, in its release PR, not committed as done.

## 1. The candidate

- [ ] A `release/vX.Y.Z` branch from `develop`, with the version in
      `package.json` / `package-lock.json` and a `## [X.Y.Z]` section in
      `CHANGELOG.md` (what each changed law judged before and after).
- [ ] The git hooks regenerated for the new version after the bump
      (`npx ruleofcode reinstall-hooks`), keeping the one documented change in
      `.husky/pre-commit`: `npx lint-staged --no-stash` (0350ddf — the stash
      list is shared by every worktree). A hook without the new version is
      reported as outdated by the self-audit.
- [ ] A release PR `release/vX.Y.Z` → `master`. Its body closes each issue of
      the wave with its own keyword (`Closes #A. Closes #B.`); PRs to `develop`
      only say `Refs #N`.
- [ ] The candidate tarball is packed from the release head (`npm pack`) and
      its sha1 is recorded. That sha1 is the thing QA and the site approve.

## 2. Build & tests

Heavy steps go through the shared gate queue
(`/d/tmp/festrr-gate/gate-slot.sh`), never around it.

- [ ] `npm ci` in a clean clone, then `npm run build` (tsc) — no errors.
- [ ] `npm run lint` and `npm run format:check` — clean.
- [ ] The full test suite: `npm test` — every suite green.
- [ ] The release canary: `npm run canary` — every stack cell green, with the
      expected law counts per stack.
- [ ] The self-audit: `npx ruleofcode audit --mode=full` on the release head
      (the pre-push hook runs it; hooks are never bypassed).
- [ ] CI on the release PR green on every Node version in the matrix
      (the required check `Constitutional gate`).

## 3. Security

- [ ] `npm audit --omit=dev` — no runtime vulnerability at moderate or above.
- [ ] `npm pack --dry-run` — the tarball holds `dist/`, the docs and the
      package files only: no `.env`, no local config, no test fixtures.
- [ ] No tool attribution in public text: `node scripts/public-text-guard.js`
      on the release notes and the PR body, and the CI check
      `No tool attribution in the pull request` green.

## 4. Approval — GO on the untagged candidate

- [ ] QA: GO on the candidate sha1 — the regression corpora and the consumer
      matrix against the previous release, with every difference explained.
- [ ] The site (ruleofcode.dev): GO on the same sha1 — its own audit and build
      against the candidate.
- [ ] Both GOs name the same sha1 as the packed tarball. A new commit means a
      new candidate and a new GO.

## 5. Release

- [ ] The release PR is merged with `--match-head-commit <approved head>`.
- [ ] An annotated tag `vX.Y.Z` on the merge commit.
- [ ] The tarball packed from the tag (two clean clones) has the approved sha1.
- [ ] `npm publish` of that tarball — by the founder, with the npm OTP.
- [ ] The GitHub Release for the tag, its notes written by hand (package names
      in backticks, no bare mentions).
- [ ] Back-merge `master` → `develop` through a PR.

## 6. After publishing — monitoring the release

- [ ] `npm view ruleofcode version` shows `X.Y.Z`; a fresh install from npm
      prints it with `npx ruleofcode --version`.
- [ ] The site shows the new version once it has bumped to it.

## Rollback / recovery

npm versions are not overwritten, and `npm unpublish` is not used for a
release consumers may already have installed.

- [ ] A broken release is deprecated: `npm deprecate ruleofcode@X.Y.Z "<what is
      broken; use X.Y.Z+1>"` — by the founder, who holds the npm credentials.
- [ ] The fix ships as a new patch release through this same checklist from
      step 1: a branch from `master` for a hotfix, or from `develop`.
- [ ] The issue that caused it gets a regression test that fails on the
      broken version and passes on the fix.

---

<!-- roc-footer -->
**Document Version:** the git history of this file &middot; **Last Updated:** 2026-11-21 &middot; **Status:** Active &middot; **Investment Rating:** reviewed
