#!/usr/bin/env bash
set -euo pipefail
ROOT="${1:?Deployment root required}"
SHA="${2:?Commit required}"
[[ "$ROOT" == /var/www/lasmunecasderamon-dashboard && "$SHA" =~ ^[a-f0-9]{40}$ ]] || exit 1
RELEASE="$ROOT/releases/$SHA"
APP=lasmunecasderamon-dashboard
PREVIOUS=$(readlink -f "$ROOT/current" 2>/dev/null || true)
if [[ -z "$PREVIOUS" || ! -d "$PREVIOUS" ]]; then PREVIOUS="$ROOT"; fi
export PATH="$HOME/.local/share/pnpm:$PATH"
command -v systemctl >/dev/null
command -v pnpm >/dev/null
node -e 'if(Number(process.versions.node.split(".")[0])!==24)process.exit(1)'
test -f "$ROOT/.env"
ln -s "$ROOT/.env" "$RELEASE/.env"
mkdir -p "$ROOT/shared/logs"
ln -s "$ROOT/shared/logs" "$RELEASE/logs"
# Preserve uploaded photos; copy bundled defaults only during initial setup.
for kind in users products; do
  mkdir -p "$ROOT/shared/img/$kind"
  if [[ -d "$ROOT/public/img/$kind" ]]; then
    cp -an "$ROOT/public/img/$kind/." "$ROOT/shared/img/$kind/"
  fi
  if [[ -d "$RELEASE/public/img/$kind" ]]; then
    cp -an "$RELEASE/public/img/$kind/." "$ROOT/shared/img/$kind/"
    mv "$RELEASE/public/img/$kind" "$RELEASE/public/img/$kind.bundled"
  fi
  mkdir -p "$RELEASE/public/img"
  ln -s "$ROOT/shared/img/$kind" "$RELEASE/public/img/$kind"
done
cd "$RELEASE"
export HUSKY=0 SKIP_SW_GENERATE=1
EXPECTED=$(node -p 'require("./package.json").packageManager.split("@")[1].split("+")[0]')
[[ "$(pnpm --version)" == "$EXPECTED" ]] || { echo 'Install the packageManager version of pnpm on the VPS.'; exit 1; }
pnpm install --frozen-lockfile
# Migration failure leaves the existing application running.
pnpm db:migrate
# The systemd runtime user needs access to configuration, cache and uploads.
chown root:www-data "$ROOT/.env"
chmod 640 "$ROOT/.env"
chown -R www-data:www-data "$RELEASE" "$ROOT/shared"
install -m 644 "$RELEASE/scripts/deploy/dashboard.service" "/etc/systemd/system/$APP.service"
systemctl daemon-reload
restart() {
  ln -sfn "$1" "$ROOT/current.next"
  mv -Tf "$ROOT/current.next" "$ROOT/current"
  systemctl restart "$APP.service"
}
rollback() {
  echo 'Release failed; restoring the previous application. Database migrations are not reversed.'
  restart "$PREVIOUS"

}
trap rollback ERR
restart "$RELEASE"
READY=0
for attempt in $(seq 1 30); do
  if curl --fail --silent --max-time 3 http://127.0.0.1:3000/api/health | node -e '
    let body=""; process.stdin.on("data", chunk => body+=chunk);
    process.stdin.on("end", () => {
      try { const report=JSON.parse(body).data;
        process.exit(report?.status === "healthy" && report?.database?.status === "healthy" ? 0 : 1);
      } catch { process.exit(1); }
    });'; then
    READY=1
    break
  fi
  sleep 2
done
[[ "$READY" == 1 ]]
systemctl enable "$APP.service"
trap - ERR
echo "Deployment healthy: $SHA"
