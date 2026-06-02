# Wireframes

## Goal

Create implementation-free page layouts for the Cloud-Init Builder.

Reference basis: official cloud-init module structure and supported config keys should remain aligned with the latest cloud-init documentation.

## Desktop Wireframe

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Cloud-Init Builder                                      [Import] [Export ▼]  │
├──────────────────────────────────────────────────────────────────────────────┤
│ [Project name]  [Target distro ▼]  [Preset ▼]             Status: Valid/Err  │
├───────────────┬───────────────────────────────────────┬──────────────────────┤
│ Navigation    │ Form Workspace                        │ Live Preview         │
│               │                                       │                      │
│ ▸ Identity    │ ┌───────────────────────────────────┐ │ #cloud-config        │
│ ▸ Users       │ │ Section title                     │ │ hostname: node01     │
│ ▸ SSH         │ │ Short help text                   │ │ users:               │
│ ▸ Packages    │ ├───────────────────────────────────┤ │   - name: admin      │
│ ▸ Network     │ │ Field group                       │ │ ...                  │
│ ▸ Storage     │ │ [ Label                  input ]  │ │                      │
│ ▸ Files       │ │ [ Label                  input ]  │ │ [Copy YAML]          │
│ ▸ Commands    │ │                                   │ │ [Download YAML]      │
│ ▸ Export      │ │ [+ Add item]                      │ │ [Download JSON]      │
│               │ └───────────────────────────────────┘ │                      │
│               │                                       │ Validation           │
│               │ ┌───────────────────────────────────┐ │ - warning/error      │
│               │ │ Advanced / Raw YAML override      │ │ - missing field      │
│               │ └───────────────────────────────────┘ │                      │
└───────────────┴───────────────────────────────────────┴──────────────────────┘