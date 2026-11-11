#!/usr/bin/env bash
set -euo pipefail

ENDPOINT="${S3_ENDPOINT:-http://host.docker.internal:4566}"
BUCKET="${S3_BUCKET:-notes-frontend-bucket}"
BASE="$ENDPOINT/$BUCKET"

cd frontend

upload() {
  local rel="$1"
  local ct="application/octet-stream"
  case "$rel" in
    *.html) ct="text/html; charset=utf-8" ;;
    *.css) ct="text/css" ;;
    *.js) ct="application/javascript" ;;
    *.json) ct="application/json" ;;
    *.svg) ct="image/svg+xml" ;;
  esac
  curl -sf -X PUT -T "dist/$rel" \
    -H "Content-Type: $ct" \
    -H "Content-Disposition: inline" \
    "$BASE/$rel"
  echo " uploaded: $rel ($ct)"
}

find dist -type f | sed 's|^dist/||' | while read -r f; do
  upload "$f"
done

echo "Frontend успешно опубликован в CI: $BASE/"