#!/bin/bash
# Genereert de campagnekaarten als PNG (1200x1500, 72 dpi, RGB) uit
# kaart-sjabloon.html met headless Chrome. Nieuwe kaart: sectie toevoegen
# in het sjabloon en hieronder een regel bijzetten.
set -euo pipefail
cd "$(dirname "$0")"

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

render () { # render <kaartnummer> <bestandsnaam>
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars \
    --force-device-scale-factor=1 --window-size=1200,1500 \
    --virtual-time-budget=4000 \
    --screenshot="$2" "file://$PWD/kaart-sjabloon.html?kaart=$1" 2>/dev/null
  echo "  $2"
}

echo "Kaarten genereren:"
render 1 kaart-1-introductie.png
render 2 kaart-2-uitslag.png
render 3 kaart-3-eigenaarschap.png
echo "Klaar."
