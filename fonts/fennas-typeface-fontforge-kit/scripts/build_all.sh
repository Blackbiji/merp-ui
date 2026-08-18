#!/usr/bin/env bash
set -euo pipefail
mkdir -p build
for face in sources/*; do
  if [ -f "$face/face.json" ]; then
    fontforge -script scripts/build_with_fontforge.py "$face" build
  fi
done
