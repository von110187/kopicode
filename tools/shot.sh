#!/bin/sh
# One screenshot of the page in headless Chrome: shot.sh <out.png> [query]
# Chrome can write the file and then never exit, so it is killed once the file is there.
C="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
OUT="$1"; Q="${2:-}"; P=$(mktemp -d); rm -f "$OUT"
"$C" --headless=new --user-data-dir="$P" --enable-unsafe-swiftshader --hide-scrollbars \
  --window-size=1400,880 --virtual-time-budget=6000 --screenshot="$OUT" \
  "file://$(cd "$(dirname "$0")/.." && pwd)/site/index.html?shot&$Q" >/dev/null 2>&1 &
PID=$!
for i in $(seq 1 60); do [ -s "$OUT" ] && break; sleep 1; done
sleep 1; kill -9 $PID 2>/dev/null; rm -rf "$P"
[ -s "$OUT" ] && echo "wrote $OUT" || { echo "no screenshot"; exit 1; }
