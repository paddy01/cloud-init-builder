# Cloud-Init Builder Personas

## Persona 1 — Homelab Hobbyist

### Profile

* Runs a small lab at home
* Uses Proxmox VE, VMware, or bare-metal virtualization
* Frequently deploys Linux VMs
* Limited cloud experience

### Goals

* Create cloud-init configurations quickly
* Avoid memorizing YAML syntax
* Reuse configurations across multiple VMs
* Learn cloud-init gradually

### Pain Points

* Cloud-init documentation feels overwhelming
* YAML formatting errors are common
* Unsure which modules are required
* Difficult to discover available options

### Typical Usage

* Create Ubuntu templates
* Configure users and SSH keys
* Install packages
* Run bootstrap commands

### Design Implications

* Guided workflow
* Safe defaults
* Inline explanations
* Visual validation before export

---

## Persona 2 — Proxmox Administrator

### Profile

* Manages multiple Proxmox clusters
* Deploys many VMs from templates
* Familiar with cloud-init concepts

### Goals

* Generate configurations rapidly
* Reuse snippets
* Standardize deployments
* Export clean YAML

### Pain Points

* Repeated manual editing
* Maintaining template files
* Verifying syntax correctness

### Typical Usage

* VM template deployment
* Network configuration
* User provisioning
* Storage and disk customization

### Design Implications

* Fast editing
* Copy/paste workflows
* YAML preview always visible
* Snippet library support

---

## Persona 3 — Systems Administrator

### Profile

* Linux administrator
* Works on-premises and in virtual environments
* Uses automation but not necessarily cloud platforms

### Goals

* Create reliable first-boot configurations
* Standardize server provisioning
* Reduce manual post-install tasks

### Pain Points

* Remembering module syntax
* Cross-referencing documentation
* Maintaining custom templates

### Typical Usage

* User management
* Package installation
* Service configuration
* File deployment

### Design Implications

* Complete module coverage
* Advanced configuration options
* Documentation links
* Validation against schema

---

## Persona 4 — Cloud Engineer

### Profile

* AWS, Azure, OpenStack, or multi-cloud user
* Already understands cloud-init
* Infrastructure-as-Code focused

### Goals

* Rapid prototyping
* Generate valid cloud-init snippets
* Validate configurations against schema

### Pain Points

* Looking up rarely used modules
* Manual YAML authoring
* Keeping configurations compliant

### Typical Usage

* Advanced networking
* Storage provisioning
* Write-files
* Boot-time automation

### Design Implications

* Power-user mode
* Raw YAML editing
* Schema validation
* Full module visibility

---

## Persona 5 — Consultant / Trainer

### Profile

* Builds environments for clients
* Demonstrates cloud-init during training
* Frequently creates example configurations

### Goals

* Produce examples quickly
* Explain generated YAML
* Share configurations with others

### Pain Points

* Building examples from scratch
* Teaching cloud-init syntax
* Maintaining demo templates

### Typical Usage

* Demo environments
* Training labs
* Documentation examples

### Design Implications

* Shareable configurations
* Human-readable summaries
* Example templates
* Export/import support

---

# Primary Target Persona

Version 1 should primarily optimize for:

1. Homelab Hobbyist
2. Proxmox Administrator

These users have the largest pain-to-benefit ratio and align closely with the project's original motivation.

# Secondary Personas

* Systems Administrator
* Cloud Engineer

# Future Persona

* Consultant / Trainer

Future collaboration, sharing, and template marketplace features can be designed around this persona.
