# Define MVP Scope

## Goal

Define the exact feature set for Version 1 of the Cloud-Init Builder and determine whether the UI can be generated automatically from official cloud-init schemas instead of manually maintained forms.

---

# MVP Vision

A single-page web application that:

* Builds valid cloud-init configurations visually
* Generates YAML in real time
* Validates generated configurations
* Supports common cloud-init functionality used by most homelab, virtualization, and cloud deployments
* Uses official cloud-init schemas whenever possible to reduce maintenance

The MVP is not intended to cover every cloud-init module.

---

# Technical Validation

## Automatic UI Generation

Investigate generating forms from:

* cloud-init JSON schema
* cloud-init module metadata
* official schema definitions exposed by cloud-init

Potential benefits:

* Automatic field generation
* Automatic validation
* Reduced maintenance
* Faster support for future cloud-init releases

Questions to answer:

1. Is the official schema sufficiently complete?
2. Does it contain field descriptions?
3. Can nested objects be rendered automatically?
4. Can module grouping be inferred?
5. Are custom UI overrides required for usability?

Success criteria:

* At least 70–80% of fields can be generated directly from schema definitions.
* Remaining fields can be handled through lightweight custom components.

---

# MVP Features

## User Configuration

Support:

* hostname
* fqdn
* default user
* additional users
* sudo permissions
* groups
* passwords (with warnings)

Cloud-init modules:

* users
* groups

---

## SSH Configuration

Support:

* authorized keys
* multiple keys
* disable password authentication
* SSH key import options if available

Cloud-init modules:

* ssh
* users

---

## Package Management

Support:

* package installation list
* package updates
* package upgrades

Cloud-init modules:

* packages
* package_update
* package_upgrade

---

## Network Configuration

Support common Netplan-compatible networking:

* DHCP IPv4
* Static IPv4
* Gateway
* DNS servers
* VLANs

Future support:

* Bonds
* Bridges
* Advanced routing

Cloud-init modules:

* network-config v2

---

## Storage Configuration

Support:

* Disk selection
* Partition creation
* Filesystem creation
* Mount points

Cloud-init modules:

* disk_setup
* fs_setup
* mounts

---

## File Creation

Support:

* Multiple files
* Permissions
* Ownership
* Inline content

Cloud-init modules:

* write_files

---

## Command Execution

Support:

* boot commands
* run commands

Cloud-init modules:

* bootcmd
* runcmd

---

## YAML Output

Support:

* Live preview
* Copy to clipboard
* Download YAML file

---

## Validation

Support:

* Schema validation
* YAML syntax validation
* Display validation errors

---

# Out of Scope

## Rare Cloud-Specific Modules

Examples:

* Azure-specific modules
* AWS-specific modules
* GCP-specific modules
* OpenStack-specific modules
* VMware-specific modules

Reason:

Low usage for initial target audience.

---

## Configuration Management Integrations

Examples:

* Puppet
* Chef
* Salt
* Ansible integration modules

Reason:

Not required for initial deployments.

---

## Advanced Networking

Examples:

* Bonding
* OVS
* Complex routing policies
* SR-IOV

Reason:

High complexity.

---

## Advanced Storage

Examples:

* RAID
* LVM
* ZFS provisioning
* Ceph configuration

Reason:

Complex UI and validation requirements.

---

## Orchestration Features

Examples:

* Multi-host deployment
* Dependency ordering
* Infrastructure templates
* Cluster builders

Reason:

Outside scope of cloud-init generation.

---

## User Accounts Beyond Basic Provisioning

Examples:

* LDAP integration
* Active Directory joining
* Identity providers

Reason:

Can be added later.

---

# MVP Success Criteria

A user can generate valid cloud-init YAML for:

* User creation
* SSH access
* Package installation
* Basic networking
* Basic storage setup
* File creation
* Startup commands

without manually editing YAML.

---

# Deliverables

* MVP feature list
* Out-of-scope definition
* Schema-generation feasibility assessment
* Recommendation for implementation approach

Recommended approach:

Schema-driven UI generation with targeted custom components for networking, storage, and user management.
