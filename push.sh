#!/bin/bash

set -euo pipefail

# === CONFIGURATION ===
IMAGE_NAME="pp3ng/cincout"
IMAGE_TAG="latest"
CACHE_IMAGE="${IMAGE_NAME}:buildcache"
PLATFORMS="linux/amd64,linux/arm64"

echo "🔨 Building Docker image: ${IMAGE_NAME}:${IMAGE_TAG}"
echo "📦 Platforms: ${PLATFORMS}"
echo "🛢️ Using cache image: ${CACHE_IMAGE}"

docker buildx build \
  --platform "$PLATFORMS" \
  --cache-from=type=registry,ref="$CACHE_IMAGE" \
  --cache-to=type=registry,ref="$CACHE_IMAGE",mode=max \
  -t "${IMAGE_NAME}:${IMAGE_TAG}" \
  --push \
  .

echo "✅ Build and push completed."

