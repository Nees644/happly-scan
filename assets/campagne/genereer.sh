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
render 4 kaart-4-leidersbeeld.png
render 5 kaart-5-succeskrachtformule.png
render "5&thema=zand" kaart-5-succeskrachtformule-zand.png
render 6 kaart-6-tot-maandag-zand.png
render 7 kaart-7-tot-maandag.png
render 8 kaart-8-payoff-zand.png
render 9 kaart-9-ook-na-maandag-zand.png
render 10 kaart-10-trainers.png
render "10&thema=zand" kaart-10-trainers-zand.png
echo "Klaar."
