# Cloud-Init Builder Field Mapping

## Purpose

Map every MVP UI field to the generated cloud-init YAML.

Generated output starts with:

```yaml
#cloud-config
```

Network configuration may be exported either inside the same user-data document or as separate `network-config` data, depending on target platform.

---

## 1. Identity

| UI Field                  | YAML Path                   | YAML Example                      | Notes                            |
| ------------------------- | --------------------------- | --------------------------------- | -------------------------------- |
| Hostname                  | `hostname`                  | `hostname: web01`                 | Short hostname.                  |
| FQDN                      | `fqdn`                      | `fqdn: web01.example.com`         | Optional.                        |
| Prefer FQDN over hostname | `prefer_fqdn_over_hostname` | `prefer_fqdn_over_hostname: true` | Optional advanced field.         |
| Manage `/etc/hosts`       | `manage_etc_hosts`          | `manage_etc_hosts: true`          | Boolean or special values later. |
| Timezone                  | `timezone`                  | `timezone: Europe/Stockholm`      | Optional.                        |
| Locale                    | `locale`                    | `locale: en_US.UTF-8`             | Optional.                        |

---

## 2. Users

| UI Field              | YAML Path                       | YAML Example                   | Notes                            |
| --------------------- | ------------------------------- | ------------------------------ | -------------------------------- |
| Preserve default user | `users[0]`                      | `- default`                    | Should be enabled by default.    |
| Username              | `users[].name`                  | `name: deploy`                 | Required for custom user.        |
| Full name             | `users[].gecos`                 | `gecos: Deploy User`           | Optional.                        |
| Primary group         | `users[].primary_group`         | `primary_group: deploy`        | Optional.                        |
| Additional groups     | `users[].groups`                | `groups: sudo,adm,docker`      | Comma-separated or array.        |
| Shell                 | `users[].shell`                 | `shell: /bin/bash`             | Default `/bin/bash`.             |
| Sudo access           | `users[].sudo`                  | `sudo: ALL=(ALL) NOPASSWD:ALL` | Optional.                        |
| Lock password         | `users[].lock_passwd`           | `lock_passwd: true`            | Recommended default.             |
| Hashed password       | `users[].passwd`                | `passwd: "$6$..."`             | Must be hashed, not plaintext.   |
| Force password change | `chpasswd.expire`               | `expire: true`                 | Global password expiry behavior. |
| SSH authorized keys   | `users[].ssh_authorized_keys[]` | `- ssh-ed25519 AAAA...`        | Per-user keys.                   |
| Create home directory | `users[].no_create_home`        | `no_create_home: false`        | Inverted UI field.               |
| Home directory        | `users[].homedir`               | `homedir: /home/deploy`        | Optional.                        |
| System user           | `users[].system`                | `system: true`                 | Optional advanced.               |

Example:

```yaml
users:
  - default
  - name: deploy
    gecos: Deploy User
    groups: sudo,adm
    shell: /bin/bash
    sudo: ALL=(ALL) NOPASSWD:ALL
    lock_passwd: true
    ssh_authorized_keys:
      - ssh-ed25519 AAAA...
```

---

## 3. Groups

| UI Field           | YAML Path  | YAML Example             | Notes              |
| ------------------ | ---------- | ------------------------ | ------------------ |
| Group name         | `groups[]` | `- docker`               | Simple group.      |
| Group with members | `groups[]` | `- admins: [deploy,ops]` | Optional advanced. |

Example:

```yaml
groups:
  - docker
  - admins: [deploy, ops]
```

---

## 4. SSH

| UI Field                  | YAML Path                      | YAML Example            | Notes                     |
| ------------------------- | ------------------------------ | ----------------------- | ------------------------- |
| Allow SSH password auth   | `ssh_pwauth`                   | `ssh_pwauth: false`     | Recommended false.        |
| Disable root SSH login    | `disable_root`                 | `disable_root: true`    | Recommended true.         |
| Root authorized keys      | `ssh_authorized_keys[]`        | `- ssh-ed25519 AAAA...` | Root-level keys.          |
| Delete existing host keys | `ssh_deletekeys`               | `ssh_deletekeys: true`  | Common for cloned images. |
| Generate host key types   | `ssh_genkeytypes[]`            | `- ed25519`             | Optional.                 |
| Publish host keys         | `ssh_publish_hostkeys.enabled` | `enabled: true`         | Optional advanced.        |

Example:

```yaml
ssh_pwauth: false
disable_root: true
ssh_deletekeys: true
ssh_genkeytypes:
  - ed25519
```

---

## 5. Packages

| UI Field             | YAML Path                    | YAML Example                       | Notes              |
| -------------------- | ---------------------------- | ---------------------------------- | ------------------ |
| Update package index | `package_update`             | `package_update: true`             | Usually enabled.   |
| Upgrade packages     | `package_upgrade`            | `package_upgrade: true`            | Optional.          |
| Reboot if required   | `package_reboot_if_required` | `package_reboot_if_required: true` | Optional.          |
| Package list         | `packages[]`                 | `- qemu-guest-agent`               | Simple list.       |
| Package with version | `packages[]`                 | `- [nginx, 1.24.*]`                | Optional advanced. |

Example:

```yaml
package_update: true
package_upgrade: false
packages:
  - qemu-guest-agent
  - curl
  - vim
```

---

## 6. Network

Use network config v2.

| UI Field              | YAML Path                                        | YAML Example                 | Notes                                     |
| --------------------- | ------------------------------------------------ | ---------------------------- | ----------------------------------------- |
| Enable network config | `network.version`                                | `version: 2`                 | Required when network is used.            |
| Interface type        | `network.ethernets`                              | `ethernets:`                 | MVP should start with Ethernet.           |
| Interface ID/name     | `network.ethernets.<id>`                         | `eth0:`                      | Usually `eth0`, `ens18`, etc.             |
| DHCP IPv4             | `network.ethernets.<id>.dhcp4`                   | `dhcp4: true`                | Default simple mode.                      |
| DHCP IPv6             | `network.ethernets.<id>.dhcp6`                   | `dhcp6: false`               | Optional.                                 |
| Static addresses      | `network.ethernets.<id>.addresses[]`             | `- 192.0.2.10/24`            | CIDR required.                            |
| Gateway IPv4          | `network.ethernets.<id>.routes[]`                | `- to: default`              | Prefer routes over legacy gateway fields. |
| DNS servers           | `network.ethernets.<id>.nameservers.addresses[]` | `- 1.1.1.1`                  | Optional.                                 |
| DNS search domains    | `network.ethernets.<id>.nameservers.search[]`    | `- example.com`              | Optional.                                 |
| Match MAC             | `network.ethernets.<id>.match.macaddress`        | `macaddress: "52:54:00:..."` | Optional.                                 |
| Rename interface      | `network.ethernets.<id>.set-name`                | `set-name: eth0`             | Optional.                                 |
| MTU                   | `network.ethernets.<id>.mtu`                     | `mtu: 1500`                  | Optional.                                 |

DHCP example:

```yaml
network:
  version: 2
  ethernets:
    eth0:
      dhcp4: true
```

Static example:

```yaml
network:
  version: 2
  ethernets:
    eth0:
      dhcp4: false
      addresses:
        - 192.0.2.10/24
      routes:
        - to: default
          via: 192.0.2.1
      nameservers:
        addresses:
          - 1.1.1.1
          - 8.8.8.8
        search:
          - example.com
```

---

## 7. Storage

| UI Field             | YAML Path                        | YAML Example                                            | Notes                    |
| -------------------- | -------------------------------- | ------------------------------------------------------- | ------------------------ |
| Grow root partition  | `growpart.mode`                  | `mode: auto`                                            | Common default.          |
| Grow devices         | `growpart.devices[]`             | `- /`                                                   | Usually root.            |
| Resize filesystem    | `resize_rootfs`                  | `resize_rootfs: true`                                   | Common default.          |
| Disk device          | `disk_setup.<device>`            | `/dev/sdb:`                                             | Advanced/destructive.    |
| Partition table type | `disk_setup.<device>.table_type` | `table_type: gpt`                                       | Advanced.                |
| Layout               | `disk_setup.<device>.layout`     | `layout: true`                                          | Simple full-disk layout. |
| Overwrite disk       | `disk_setup.<device>.overwrite`  | `overwrite: false`                                      | Must default false.      |
| Filesystem label     | `fs_setup[].label`               | `label: data`                                           | Optional.                |
| Filesystem type      | `fs_setup[].filesystem`          | `filesystem: ext4`                                      | Optional.                |
| Filesystem device    | `fs_setup[].device`              | `device: /dev/sdb1`                                     | Optional.                |
| Mount device         | `mounts[][]`                     | `[ /dev/sdb1, /data, ext4, defaults,nofail, "0", "2" ]` | Mirrors fstab fields.    |

Example:

```yaml
growpart:
  mode: auto
  devices:
    - /
resize_rootfs: true
```

Advanced disk example:

```yaml
disk_setup:
  /dev/sdb:
    table_type: gpt
    layout: true
    overwrite: false

fs_setup:
  - label: data
    filesystem: ext4
    device: /dev/sdb1

mounts:
  - [ /dev/sdb1, /data, ext4, defaults,nofail, "0", "2" ]
```

---

## 8. Write Files

| UI Field                    | YAML Path                   | YAML Example              | Notes                                         |           |
| --------------------------- | --------------------------- | ------------------------- | --------------------------------------------- | --------- |
| File path                   | `write_files[].path`        | `path: /etc/example.conf` | Required.                                     |           |
| File content                | `write_files[].content`     | `content:                 | `                                             | Required. |
| Owner                       | `write_files[].owner`       | `owner: root:root`        | Optional.                                     |           |
| Permissions                 | `write_files[].permissions` | `permissions: "0644"`     | Quote octal strings.                          |           |
| Encoding                    | `write_files[].encoding`    | `encoding: b64`           | Optional.                                     |           |
| Append instead of overwrite | `write_files[].append`      | `append: true`            | Optional.                                     |           |
| Defer write                 | `write_files[].defer`       | `defer: true`             | Useful when users/packages are created later. |           |

Example:

```yaml
write_files:
  - path: /etc/example.conf
    owner: root:root
    permissions: "0644"
    content: |
      example=true
```

---

## 9. Commands

| UI Field               | YAML Path               | YAML Example                                | Notes                      |
| ---------------------- | ----------------------- | ------------------------------------------- | -------------------------- |
| Boot command           | `bootcmd[]`             | `- echo early`                              | Runs early. Use carefully. |
| Run command            | `runcmd[]`              | `- systemctl enable --now qemu-guest-agent` | Common MVP field.          |
| Final message          | `final_message`         | `final_message: "cloud-init complete"`      | Optional.                  |
| Power action mode      | `power_state.mode`      | `mode: reboot`                              | Optional.                  |
| Power action delay     | `power_state.delay`     | `delay: "+1"`                               | Optional.                  |
| Power action message   | `power_state.message`   | `message: Rebooting`                        | Optional.                  |
| Power action condition | `power_state.condition` | `condition: true`                           | Optional.                  |

Example:

```yaml
runcmd:
  - systemctl enable --now qemu-guest-agent
  - echo "Provisioning complete"
```

---

## 10. Export

| UI Field                   | Output Behavior                                              | Notes                                   |
| -------------------------- | ------------------------------------------------------------ | --------------------------------------- |
| Export single cloud-config | Generate one `user-data` YAML file                           | Default MVP mode.                       |
| Export NoCloud ISO files   | Generate `user-data`, `meta-data`, optional `network-config` | Useful for Proxmox/NoCloud.             |
| Instance ID                | `meta-data.instance-id`                                      | For NoCloud export.                     |
| Local hostname             | `meta-data.local-hostname`                                   | Often same as `hostname`.               |
| Split network config       | Separate `network-config` file                               | Recommended for some NoCloud workflows. |
| Validate YAML              | Run YAML parser/client validation                            | Should happen before copy/download.     |

Example `meta-data`:

```yaml
instance-id: iid-local01
local-hostname: web01
```

---

## MVP Mapping Priority

| Priority | Section                      | Status                                      |
| -------- | ---------------------------- | ------------------------------------------- |
| P0       | Identity                     | Required                                    |
| P0       | Users                        | Required                                    |
| P0       | SSH                          | Required                                    |
| P0       | Packages                     | Required                                    |
| P0       | Write Files                  | Required                                    |
| P0       | Run Commands                 | Required                                    |
| P1       | Network DHCP/static Ethernet | Required for useful Proxmox/NoCloud support |
| P1       | Basic growpart/root resize   | Recommended                                 |
| P2       | Advanced disk setup          | Include with destructive warnings           |
| P2       | Bridges, bonds, VLANs        | Later custom components                     |
| P2       | Power state                  | Later optional                              |
| P3       | Cloud-specific modules       | Out of scope for MVP                        |

---

## Implementation Notes

1. Form state should use stable internal field IDs, not raw YAML paths.
2. YAML paths should be generated by a mapping layer.
3. Empty fields must be omitted from output.
4. Dangerous storage fields must require explicit confirmation.
5. Password fields must warn that plaintext passwords are unsafe.
6. SSH password authentication should default to disabled.
7. Network config should support separate export as `network-config`.
8. Generated YAML should preserve user ordering for packages, files, and commands.
9. Validation should run after generation, not only during form entry.
10. Schema-generated fields can cover many simple scalar/list/object values, but storage and network should use custom UI components.
