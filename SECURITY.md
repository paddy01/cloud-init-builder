# Security Policy

Cloud-Init Builder is a client-side single-page app. It has no backend, account
system, or server-side storage in the current v1 scope. Security work should
focus on protecting users from unsafe generated configuration, unsafe import
behavior, dependency risk, and browser-side data handling mistakes.

## Supported Versions

| Version | Supported |
| --- | --- |
| `0.1.x` | Yes |

Pre-release branches, local experiments, and unreleased planning work are not
covered by this policy unless maintainers explicitly say otherwise.

## Reporting a Vulnerability

Please do not publish exploit details in a public issue before maintainers have
had a chance to respond.

Preferred reporting path:

1. Use the repository's private security advisory feature if it is available.
2. If no advisory feature is available, contact a maintainer privately using the
   contact information listed on the project or repository profile.
3. If no private contact is available, open a public issue requesting a private
   security contact. Do not include exploit details, secrets, or sensitive
   infrastructure information in that issue.

Include:

- A short summary of the issue
- Steps to reproduce
- Impact and affected behavior
- Affected browser or dependency versions, if relevant
- Any suggested fix or mitigation

## In Scope

- Generated YAML that could misrepresent user intent or weaken system security.
- Import handling that allows malformed project files to corrupt state or bypass
  validation.
- Export, copy, or preview behavior that emits invalid or unsafe cloud-init data
  despite blocking validation errors.
- Browser-side handling of sensitive project data, SSH keys, password hashes, or
  downloaded files.
- Dependency vulnerabilities that affect the built app or development pipeline.
- Cross-site scripting or injection issues in the SPA.

## Out of Scope

- Vulnerabilities in cloud-init itself, Proxmox, Linux distributions, browsers,
  or static hosting providers.
- User-authored commands that are risky but clearly represented and warned about
  by the builder.
- Social engineering, spam, denial of service against public project spaces, or
  issues requiring physical access to a contributor's machine.
- Findings from automated scanners that do not include a practical impact for
  this project.

## Handling Expectations

Maintainers should acknowledge valid reports when possible, investigate the
impact, and avoid public disclosure until a fix or mitigation is ready. When a
report is accepted, the fix should include regression coverage where practical.

## Safe Disclosure

After a fix is available, maintainers may publish a summary that describes the
impact, affected versions, mitigation, and credit to the reporter if requested.
