# Security Policy

## Supported Versions

Security fixes are made on the latest major release line only — the version
published under the `latest` tag on npm (`npm view ruleofcode version`).

| Version              | Supported |
| -------------------- | --------- |
| latest major release | yes       |
| older major releases | no        |

A fix ships as a new patch or minor release of the latest major. To receive it,
upgrade to the newest release of that line.

## Reporting Security Vulnerabilities

Please do **not** report a vulnerability in a public issue, pull request or
discussion.

Report it privately through GitHub Security Advisories on this repository:

1. Open the repository's **Security** tab.
2. Choose **Report a vulnerability**.
3. Describe the issue: the affected version, how to reproduce it, and what an
   attacker gains.

The report is visible only to you and the repository maintainers. If the
**Report a vulnerability** button is not shown, open a public issue that asks
for a private channel and contains no details of the vulnerability.

## Security Update Process

1. The maintainers confirm the report in the private advisory and agree the
   scope with the reporter there.
2. The fix is prepared and reviewed in the advisory's private fork.
3. The fix is released to npm as a new version of the latest major.
4. The advisory is published with the affected and fixed versions, and the
   reporter is credited unless they ask not to be.

## Scope

RoC is a command-line auditor. It reads the files of the project it audits and
writes its reports locally.

Auditing a project runs code from that project: when the audited project has
its own `typescript` package installed, RoC loads that package to parse the
project's sources. Audit only repositories you trust, or audit an untrusted
repository in an isolated environment (a container or a disposable machine).

## Contact Information

The only supported channel for a security report is the private advisory
described above, under **Reporting Security Vulnerabilities**.
