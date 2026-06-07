# Scripts

Operational and deployment scripts for the Infinity server.

Run from the project root unless a script states otherwise.

## VM setup

`setup-debian-vm.sh` — prepares a Debian VM (11/12/13) with Docker Engine, Compose, and basic deployment tools (`git`, `rsync`, `jq`).

```bash
chmod +x scripts/setup-debian-vm.sh
sudo ./scripts/setup-debian-vm.sh          # uses SUDO_USER for docker group
sudo ./scripts/setup-debian-vm.sh myuser   # explicit login user
```
