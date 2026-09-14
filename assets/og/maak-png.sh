#!/bin/bash
# Zet assets/og/deelbeeld.html om naar de PNG die op de pagina wordt gebruikt.
# Eerst node scripts/bouw-deelbeeld.mjs draaien; die maakt de HTML.
set -euo pipefail
cd "$(dirname "$0")"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

"$CHROME" --headless=new --disable-gpu --hide-scrollbars \
  --force-device-scale-factor=1 --window-size=1200,630 \
  --virtual-time-budget=5000 \
  --screenshot="og-teamkrachtindex.png" "file://$PWD/deelbeeld.html" 2>/dev/null

echo "  og-teamkrachtindex.png"
