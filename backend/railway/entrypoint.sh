#!/bin/sh
set -eu
: "${AUTH_USERNAME:?Set AUTH_USERNAME in Railway service variables}"
: "${AUTH_PASSWORD:?Set AUTH_PASSWORD in Railway service variables}"
if [ "${#AUTH_PASSWORD}" -lt 24 ]; then
  echo 'AUTH_PASSWORD must contain at least 24 characters.' >&2
  exit 1
fi
if [ "${RAILWAY_VOLUME_MOUNT_PATH:-}" != '/home/suwayomi/.local/share/Tachidesk' ]; then
  echo 'Attach a persistent Railway volume at /home/suwayomi/.local/share/Tachidesk.' >&2
  exit 1
fi
export AUTH_MODE=basic_auth
export BIND_IP=0.0.0.0
export BIND_PORT=4567
exec /home/suwayomi/startup_script.sh
