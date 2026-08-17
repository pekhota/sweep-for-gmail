#!/usr/bin/env bash
# Render Sweep's store artwork at the exact pixel sizes the Chrome Web Store demands.
#
# Headless Chrome rather than a screenshot of a real window: the store rejects anything
# that isn't precisely 1280x800 / 440x280 / 1400x560, and a real window is subject to
# device pixel ratio. --force-device-scale-factor=1 pins it.
#
#   ./tools/make_assets.sh            # render everything
#   ./tools/make_assets.sh shot-3     # render one

set -euo pipefail

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/assets/src"
OUT="$ROOT/assets/store"

mkdir -p "$OUT"

render() {
  local name="$1" w="$2" h="$3"
  [ -f "$SRC/$name.html" ] || { echo "skip $name (no source)"; return; }
  "$CHROME" \
    --headless \
    --disable-gpu \
    --hide-scrollbars \
    --force-device-scale-factor=1 \
    --window-size="$w,$h" \
    --screenshot="$OUT/$name.png" \
    "file://$SRC/$name.html" >/dev/null 2>&1
  echo "$(sips -g pixelWidth -g pixelHeight "$OUT/$name.png" | awk '/pixel/{printf "%s ", $2}')-> $name.png"
}

only="${1:-}"

for spec in \
  "shot-1 1280 800" \
  "shot-2 1280 800" \
  "shot-3 1280 800" \
  "shot-4 1280 800" \
  "shot-5 1280 800" \
  "promo-small 440 280" \
  "promo-marquee 1400 560"
do
  set -- $spec
  if [ -z "$only" ] || [ "$only" = "$1" ]; then
    render "$1" "$2" "$3"
  fi
done

# The landing page serves its own copies of some of these, and a stale copy there is
# invisible until someone points out the site does not match the store. Re-copy whatever
# docs/ already holds; never add files it has not opted into.
for f in docs/*.png; do
  name="$(basename "$f")"
  if [ -f "assets/store/$name" ]; then
    cp "assets/store/$name" "$f"
    echo "synced -> $f"
  fi
done
