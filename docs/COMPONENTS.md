# Component Inventory

## Core Layout

- App shell
- Header bar
- Section navigation
- Main form area
- YAML preview panel
- Validation/status panel
- Export/share panel
- Mobile drawer navigation
- Responsive two-column layout
- Single-column mobile layout

## Shared Form Components

- Text input
- Textarea
- Password/secret input
- Number input
- Checkbox
- Toggle switch
- Select dropdown
- Multi-select dropdown
- Radio group
- Tag/token input
- Key-value editor
- List editor
- Object/card editor
- Collapsible section
- Help tooltip
- Inline documentation link
- Field validation message
- Warning banner
- Error banner
- Empty-state message

## Identity

- Hostname input
- FQDN input
- Preserve hostname toggle
- Manage `/etc/hosts` toggle
- Timezone selector
- Locale selector

## Users

- User list editor
- User card editor
- Username input
- Full name/gecos input
- Primary group input
- Groups multi-select/tag input
- Shell selector
- Sudo rule editor
- Lock password toggle
- Password hash input
- SSH authorized keys editor
- User create/delete controls

## SSH

- SSH enable/disable section
- Authorized key textarea
- SSH key list editor
- Key type detector/display
- Import public key button
- Disable root SSH toggle
- SSH password auth toggle
- Known hosts editor

## Packages

- Package update toggle
- Package upgrade toggle
- Package reboot-if-required toggle
- Package list editor
- Package name input
- Package manager selector
- Package source/repository editor

## Network

Cloud-init network config may come from datasource, system config, kernel command line, or fallback behavior; user-data cannot generally change instance network config directly. Network config should therefore be handled as an advanced/export-aware area. :contentReference[oaicite:0]{index=0}

- Network mode selector
- Disable cloud-init networking toggle
- Disable network activation toggle
- Renderer selector
- Interface list editor
- Interface name input
- DHCP toggle
- Static address list editor
- Gateway input
- DNS servers editor
- DNS search domains editor
- VLAN editor
- Bond editor
- Bridge editor
- Raw network YAML editor

## Storage

- Disk/device list editor
- Partition editor
- Filesystem editor
- Mount editor
- Growpart editor
- Swap editor
- Advanced raw storage YAML editor

## Files

- File list editor
- File path input
- Owner input
- Permissions input
- Encoding selector
- File content editor
- Append/overwrite selector
- Defer write toggle

## Commands

`runcmd` runs once on first boot after other configuration is applied; `bootcmd` runs on every boot earlier in the boot process. Both accept strings or list-style commands. :contentReference[oaicite:1]{index=1}

- Run command list editor
- Boot command list editor
- Command mode selector: string/list
- Command textarea
- Command reorder controls
- Command warning/quoting helper

## YAML / Export

- YAML preview
- YAML syntax highlighter
- YAML copy button
- YAML download button
- JSON project export button
- JSON project import button
- Reset project button
- Validation summary
- Omit-empty-sections indicator
- Generated comments toggle
- Multi-document export toggle

## Schema-Driven Components

Cloud-init modules expose config schemas in the official module reference, but schema coverage and field complexity vary by module. Deprecated/changed keys are also tracked in the docs and may change over release timelines. :contentReference[oaicite:2]{index=2}

- Schema object renderer
- Schema array renderer
- Schema enum renderer
- Schema boolean renderer
- Schema string renderer
- Schema number renderer
- Schema advanced fallback editor
- Deprecated field warning
- Changed field warning
- Unsupported module warning

## Custom Components Required

- SSH key editor
- User editor
- Package list editor
- Network interface editor
- Storage/device editor
- File editor
- Command editor
- YAML preview
- Import/export project component
- Validation summary component

## MVP Component Priority

### Must Have

- App shell
- Section navigation
- Text input
- Textarea
- Checkbox/toggle
- Select dropdown
- List editor
- User editor
- SSH key editor
- Package list editor
- File editor
- Command editor
- YAML preview
- JSON import/export
- YAML download

### Should Have

- Network basic editor
- Storage basic editor
- Validation summary
- Help tooltip
- Documentation links
- Mobile drawer navigation

### Later

- Full schema auto-renderer
- Advanced network editor
- Advanced storage editor
- Module marketplace/browser
- Translation UI tools
- Share-by-URL encoder