#!/bin/bash
set -e

cd "$(dirname "$0")/.."

echo "Building GTKX Example Flatpak..."

pnpm bundle

cp ../../packages/native/index.node dist/

flatpak-builder \
    --force-clean \
    --user \
    --install-deps-from=flathub \
    --repo=flatpak-repo \
    build-dir \
    flatpak/org.gtkx.example.yaml

flatpak build-bundle \
    flatpak-repo \
    dist/org.gtkx.example.flatpak \
    org.gtkx.example

echo "Flatpak built: dist/org.gtkx.example.flatpak"
echo ""
echo "To install:"
echo "  flatpak install --user dist/org.gtkx.example.flatpak"
echo ""
echo "To run:"
echo "  flatpak run org.gtkx.example"
