#!/bin/bash
# Builds a clean tarball of the signage renderer system.
# Excludes node_modules, build artifacts, logs, and runtime files.

set -euo pipefail

PROJECT_DIR="/home/z/my-project"
OUTPUT_DIR="/home/z/my-project/download"
TARBALL="$OUTPUT_DIR/signage-renderer.tar.gz"

# Clean up old downloads
rm -f "$OUTPUT_DIR"/screenshot*.png 2>/dev/null || true
rm -f "$OUTPUT_DIR"/signage-*.png 2>/dev/null || true
rm -f "$OUTPUT_DIR"/test-*.png 2>/dev/null || true
rm -f "$OUTPUT_DIR"/storage-tab-*.png 2>/dev/null || true

# Make sure output dir exists
mkdir -p "$OUTPUT_DIR"

# Build the tarball from the project root, excluding heavy/runtime stuff
cd "$PROJECT_DIR"

echo "Building tarball..."
tar -czf "$TARBALL" \
  --exclude='./node_modules' \
  --exclude='./node_modules_signage-server' \
  --exclude='./mini-services/signage-server/node_modules' \
  --exclude='./.next' \
  --exclude='./.git' \
  --exclude='./.zscripts' \
  --exclude='./skills' \
  --exclude='./upload' \
  --exclude='./db' \
  --exclude='./prisma' \
  --exclude='./dev.log' \
  --exclude='./server.log' \
  --exclude='./signage-server.log' \
  --exclude='./signage-server.pid' \
  --exclude='./image_analysis.json' \
  --exclude='./bun.lock' \
  --exclude='./download' \
  --exclude='./.env.local' \
  . 2>&1

echo ""
echo "✅ Tarball built: $TARBALL"
echo "   Size: $(du -h "$TARBALL" | cut -f1)"
echo "   Files: $(tar -tzf "$TARBALL" | wc -l)"
echo ""
echo "Top-level contents:"
tar -tzf "$TARBALL" | grep -v '/' | head -20
echo ""
echo "First 30 files:"
tar -tzf "$TARBALL" | head -30
