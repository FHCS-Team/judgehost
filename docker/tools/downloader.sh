#!/bin/sh
set -euo pipefail

TMPDIR="/tmp/jh-down"
DEST="/opt/judgehost/data"
URL="${ARTIFACT_URL:-https://example.com/artifact.tar.gz}"
SUM="${ARTIFACT_SHA256:-}"   # expected sha256 hex
SIG="${ARTIFACT_SIG_URL:-}"  # optional signature URL

mkdir -p "$TMPDIR" "$DEST"
cd "$TMPDIR"

echo "[PRE] Downloading $URL..."
curl -fsSLO "$URL"

FNAME="$(basename "$URL")"
if [ -n "$SUM" ]; then
  echo "[PRE] Verifying sha256..."
  echo "$SUM  $FNAME" > checksum.txt
  sha256sum -c checksum.txt
fi

if [ -n "$SIG" ]; then
  echo "[PRE] Downloading signature and verifying with GPG..."
  curl -fsSLO "$SIG"
  # assumes keys are preinstalled in /etc/judgehost/keys or gpg home
  gpg --verify "${FNAME}.sig" "$FNAME"
fi

echo "[PRE] Extracting to temp dir..."
mkdir -p "$TMPDIR/extracted"
tar -xzf "$FNAME" -C "$TMPDIR/extracted"

echo "[PRE] Moving into place atomically..."
rm -rf "$DEST.old" || true
if [ -d "$DEST" ]; then mv "$DEST" "$DEST.old"; fi
mv "$TMPDIR/extracted" "$DEST"

echo "[PRE] Set permissions..."
chown -R judge:judge "$DEST"
chmod -R 750 "$DEST"

echo "[PRE] Cleanup..."
rm -rf "$TMPDIR"
echo "[PRE] Download & verify complete."