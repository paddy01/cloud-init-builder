# Validation Rules

## Purpose

Define all validation rules used by the Cloud-Init Builder.

Validation occurs at three levels:

1. UI input validation
2. Project file validation
3. Generated cloud-init YAML validation

Validation should be immediate where possible and block invalid export operations.

---

# General Principles

## Error Severity

### Error

Configuration cannot be exported.

Examples:

* Invalid hostname
* Invalid CIDR
* Duplicate username

### Warning

Export allowed but user should review.

Examples:

* No SSH keys configured
* Password authentication enabled
* Large package list

### Info

Non-blocking guidance.

Examples:

* Hostname follows RFC standards
* Static IP selected

---

# Hostname Validation

Maps to:

```yaml
hostname:
fqdn:
```

## Rules

| Rule                | Validation           |
| ------------------- | -------------------- |
| Required            | Yes                  |
| Length              | 1-63 chars per label |
| Total FQDN Length   | <=253 chars          |
| Allowed Characters  | a-z A-Z 0-9 -        |
| Must Not Start With | -                    |
| Must Not End With   | -                    |
| Spaces              | Not allowed          |
| Underscore          | Not allowed          |

## Examples

Valid:

```text
web01
pve-node-1
db.internal.lab
```

Invalid:

```text
web server
-node1
node1-
node_1
```

---

# Username Validation

Maps to:

```yaml
users:
```

## Rules

| Rule               | Validation           |
| ------------------ | -------------------- |
| Required           | Yes                  |
| Length             | 1-32                 |
| First Character    | Letter or underscore |
| Allowed Characters | a-z A-Z 0-9 _ -      |
| Spaces             | Not allowed          |

## Reserved Usernames

Warn or block:

```text
root
daemon
bin
nobody
```

## Duplicate Detection

Usernames must be unique.

---

# Password Validation

Maps to:

```yaml
users:
```

## Rules

### Plain Text Passwords

Not recommended.

Warning:

```text
Plain text passwords reduce security.
```

### Hashed Passwords

Accept:

```text
$6$
$5$
$2y$
```

Common Linux hash formats.

---

# SSH Public Key Validation

Maps to:

```yaml
ssh_authorized_keys:
```

## Accepted Types

```text
ssh-ed25519
ssh-rsa
ecdsa-sha2-nistp256
ecdsa-sha2-nistp384
ecdsa-sha2-nistp521
sk-ssh-ed25519@openssh.com
sk-ecdsa-sha2-nistp256@openssh.com
```

## Rules

| Rule                  | Validation |
| --------------------- | ---------- |
| Must contain key type | Yes        |
| Must contain key body | Yes        |
| Base64 payload valid  | Yes        |
| Empty lines ignored   | Yes        |

Invalid:

```text
abcdefg
```

---

# Package Validation

Maps to:

```yaml
packages:
```

## Rules

| Rule                            | Validation |
| ------------------------------- | ---------- |
| Empty lines removed             | Yes        |
| Duplicate packages removed      | Yes        |
| Leading/trailing spaces trimmed | Yes        |

Warning:

```text
More than 100 packages selected.
```

---

# Network Validation

Maps to:

```yaml
network:
```

---

## Interface Name

Examples:

```text
eth0
ens18
enp1s0
bond0
br0
```

Rules:

* Required
* No spaces
* Unique within config

---

## IPv4 Address

Rules:

* Valid IPv4
* Optional CIDR suffix validation

Valid:

```text
192.168.1.10
```

Invalid:

```text
999.999.999.999
```

---

## CIDR Validation

Valid range:

```text
/0 - /32
```

Examples:

Valid:

```text
192.168.1.10/24
10.0.0.5/16
```

Invalid:

```text
192.168.1.10/99
```

---

## Gateway Validation

Rules:

* Valid IPv4 or IPv6
* Must belong to same subnet (warning if not)

---

## DNS Validation

Accepted:

```text
1.1.1.1
8.8.8.8
2606:4700:4700::1111
```

Rules:

* Valid IP
* Duplicates removed

---

# IPv6 Validation

Rules:

* RFC-compliant IPv6 parsing
* CIDR range 0-128

Examples:

Valid:

```text
2001:db8::1/64
```

Invalid:

```text
2001:::1
```

---

# Storage Validation

Maps to:

```yaml
disk_setup:
fs_setup:
mounts:
```

## Device Path

Valid:

```text
/dev/sda
/dev/vda
/dev/nvme0n1
```

Rules:

* Must start with `/dev/`
* No spaces

---

## Filesystem Type

Allowed:

```text
ext4
xfs
btrfs
zfs
vfat
swap
```

Validation should use an allow-list.

---

## Mount Point

Rules:

* Must start with `/`
* No spaces
* Unique mount points

Valid:

```text
/
 /data
 /srv
```

Invalid:

```text
data
/my folder
```

---

# File Editor Validation

Maps to:

```yaml
write_files:
```

## File Path

Rules:

* Required
* Must be absolute

Valid:

```text
/etc/motd
/opt/app/config.yaml
```

Invalid:

```text
config.yaml
```

---

## File Permissions

Accepted formats:

```text
0644
0600
0755
0700
```

Regex:

```regex
^[0-7]{4}$
```

---

## Encoding

Allow:

```text
plain
b64
gzip
gz+b64
```

---

# Command Validation

Maps to:

```yaml
runcmd:
bootcmd:
```

## Rules

* Empty commands removed
* Preserve ordering
* Allow multiline entries

Warning:

```text
Commands execute with root privileges.
```

---

# YAML Validation

Before export:

## Required Checks

### YAML Syntax

Generated YAML must parse successfully.

### Cloud-Init Structure

Validate:

```yaml
#cloud-config
```

exists when required.

### Duplicate Keys

Disallow duplicate YAML keys.

### Empty Sections

Remove automatically.

Example:

```yaml
packages: []
```

Should be omitted.

---

# Project File Validation

JSON project format must validate against schema.

## Required Fields

```json
{
  "version": "1",
  "metadata": {},
  "config": {}
}
```

---

# Cross-Field Validation

## Static IP Without Gateway

Warning:

```text
Static IP configured without gateway.
```

---

## User Without Authentication

Error:

```text
User has no password and no SSH key.
```

---

## SSH Disabled With No Password

Error:

```text
No authentication method available.
```

---

## Duplicate Mount Points

Error:

```text
Mount points must be unique.
```

---

## Duplicate Network Interfaces

Error:

```text
Interface names must be unique.
```

---

# Export Gate

Export is blocked when:

* Validation errors exist
* JSON schema validation fails
* YAML generation fails

Export is allowed when:

* Only warnings exist
* Only informational messages exist

---

# Future Validation Enhancements

## Cloud-Init Schema Validation

Validate generated YAML against official cloud-init schemas when available.

## Distribution Awareness

Apply distro-specific validation:

Examples:

* Ubuntu package names
* Debian package names
* RHEL package names

## Module Dependency Validation

Examples:

```text
mounts require filesystem definition
users require username
network routes require gateway
```

These validations should be added after MVP.
