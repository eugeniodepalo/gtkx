#!/bin/bash
set -e

cd "$(dirname "$0")/.."

echo "Building GTKX Example Snap..."

# Ensure the app is built
pnpm bundle
pnpm build:sea

# Build the Snap
snapcraft

echo "Snap built successfully!"
echo ""
echo "To install (devmode):"
echo "  sudo snap install --devmode gtkx-example_*.snap"
echo ""
echo "To run:"
echo "  gtkx-example"
