#!/bin/bash

PACKAGES_DIR="/Users/paluchs/iohk/dev/github/midnightntwrk/midnight-wallet/packages"

echo "=== Yarn Link to Dist Script ==="
echo ""

for dir in "$PACKAGES_DIR"/*/ ; do
  DIST_PATH="${dir}dist"

  if [ -d "$DIST_PATH" ]; then
    echo "Linking: $DIST_PATH"
    yarn link "$DIST_PATH"
  fi
done

echo ""
echo "✓ Done!"
