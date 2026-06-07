#!/usr/bin/env bash
#
# Prepare a Debian VM to run Infinity Docker workloads.
# Tested for Debian 13 (Trixie); also supports Bookworm and Bullseye.
#
# Usage:
#   sudo ./scripts/setup-debian-vm.sh [username]
#
# If username is omitted, SUDO_USER is used when available.

set -euo pipefail

DOCKER_APT_KEYRING="/etc/apt/keyrings/docker.asc"
DOCKER_APT_SOURCE="/etc/apt/sources.list.d/docker.sources"

log() {
  printf '==> %s\n' "$*"
}

die() {
  printf 'error: %s\n' "$*" >&2
  exit 1
}

require_root() {
  if [[ "${EUID}" -ne 0 ]]; then
    die "run as root: sudo $0 [username]"
  fi
}

require_debian() {
  if [[ ! -f /etc/os-release ]]; then
    die "/etc/os-release not found; this script supports Debian only"
  fi

  # shellcheck disable=SC1091
  . /etc/os-release

  if [[ "${ID:-}" != "debian" ]]; then
    die "unsupported OS (${PRETTY_NAME:-unknown}); Debian only"
  fi

  case "${VERSION_ID:-}" in
    11 | 12 | 13) ;;
    *)
      log "warning: Debian ${VERSION_ID:-unknown} is not explicitly validated; continuing with codename ${VERSION_CODENAME:-unknown}"
      ;;
  esac

  if [[ -z "${VERSION_CODENAME:-}" ]]; then
    die "could not detect Debian codename (VERSION_CODENAME)"
  fi

  log "detected ${PRETTY_NAME} (${VERSION_CODENAME})"
}

resolve_target_user() {
  local requested_user="${1:-}"

  if [[ -n "${requested_user}" ]]; then
    TARGET_USER="${requested_user}"
    return
  fi

  if [[ -n "${SUDO_USER:-}" && "${SUDO_USER}" != "root" ]]; then
    TARGET_USER="${SUDO_USER}"
    return
  fi

  TARGET_USER=""
}

install_base_packages() {
  log "installing base packages"
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq
  apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    gnupg \
    git \
    rsync \
    jq
}

configure_docker_apt_repository() {
  log "configuring Docker apt repository"

  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/debian/gpg -o "${DOCKER_APT_KEYRING}"
  chmod a+r "${DOCKER_APT_KEYRING}"

  # shellcheck disable=SC1091
  . /etc/os-release

  tee "${DOCKER_APT_SOURCE}" >/dev/null <<EOF
Types: deb
URIs: https://download.docker.com/linux/debian
Suites: ${VERSION_CODENAME}
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: ${DOCKER_APT_KEYRING}
EOF
}

install_docker() {
  log "installing Docker Engine and Compose plugin"
  apt-get update -qq
  apt-get install -y --no-install-recommends \
    docker-ce \
    docker-ce-cli \
    containerd.io \
    docker-buildx-plugin \
    docker-compose-plugin
}

configure_docker_service() {
  log "enabling Docker service"
  systemctl enable docker
  systemctl start docker
}

add_user_to_docker_group() {
  if [[ -z "${TARGET_USER}" ]]; then
    log "no non-root user provided; skip docker group membership"
    log "add a user later with: usermod -aG docker <username>"
    return
  fi

  if ! id "${TARGET_USER}" >/dev/null 2>&1; then
    die "user '${TARGET_USER}' does not exist"
  fi

  log "adding '${TARGET_USER}' to the docker group"
  /usr/sbin/usermod -aG docker "${TARGET_USER}"
}

verify_installation() {
  log "verifying Docker installation"
  docker --version
  docker compose version
  docker run --rm hello-world >/dev/null
  log "hello-world container ran successfully"
}

print_next_steps() {
  cat <<EOF

Infinity VM setup complete.

Next steps:
  1. Copy or clone the project onto this VM.
  2. Create a .env file from .env.example with production values.
  3. Start databases:
       docker compose -f docker/docker-compose.yml up -d
  4. Build and run the app image:
       docker build -f docker/Dockerfile -t infinity-server .
       docker run -d --name infinity-server --env-file .env -p 4000:4000 infinity-server

EOF

  if [[ -n "${TARGET_USER}" ]]; then
    cat <<EOF
  5. Log out and back in as '${TARGET_USER}' (or run: newgrp docker)
     so Docker commands work without sudo.

EOF
  fi
}

main() {
  require_root
  require_debian
  resolve_target_user "${1:-}"

  install_base_packages
  configure_docker_apt_repository
  install_docker
  configure_docker_service
  add_user_to_docker_group
  verify_installation
  print_next_steps
}

main "$@"
