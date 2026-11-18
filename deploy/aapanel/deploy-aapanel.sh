#!/bin/bash
# ==============================================================================
# Script Deploy WAgyuu Central Gateway di aaPanel VPS (Tanpa Docker)
# ==============================================================================

set -e

SITE_DIR="/www/wwwroot/wa-api.billi-panca-wijaya.my.id"
GATEWAY_DIR="$SITE_DIR/apps/gateway"

echo "=== [1/5] Memastikan direktori data dan sesi ==="
mkdir -p "$SITE_DIR/data/sessions"
chown -R www:www "$SITE_DIR/data"
chmod -R 775 "$SITE_DIR/data"

echo "=== [2/5] Menginstal dependencies Node.js ==="
cd "$GATEWAY_DIR"
npm install --omit=dev --no-audit --no-fund

echo "=== [3/5] Membangun production bundle NestJS ==="
npm run build

echo "=== [4/5] Memasang systemd service unit ==="
cp "$SITE_DIR/deploy/aapanel/wagyuu-gateway.service" /etc/systemd/system/wagyuu-gateway.service
systemctl daemon-reload
systemctl enable wagyuu-gateway.service

echo "=== [5/5] Merestart layanan WAgyuu Gateway ==="
systemctl restart wagyuu-gateway.service
systemctl status wagyuu-gateway.service --no-pager

echo "=== Selesai! WAgyuu Gateway aktif di port 18091 ==="
