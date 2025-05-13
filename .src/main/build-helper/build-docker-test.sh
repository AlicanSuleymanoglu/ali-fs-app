#!/bin/bash
#set -euxo pipefail
set -e

E2E_IMAGE="${E2E_IMAGE:-europe-west3-docker.pkg.dev/iac-dev-432418/mcr-microsoft-com/playwright:v1.52.0-noble}"

test -t 0 && DOCKER_USE_TTY="-it"

echo "======================================"
echo "= e2e test"
echo "= "

if [[ -f playwright.config.js ]];then
  docker run ${DOCKER_USE_TTY} --rm \
      --net=host \
      -u $(id -u ${USER}):$(id -g ${USER}) \
      -v "$(pwd)":"$(pwd)"  \
      -w "$(pwd)" \
      -e PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
      -e NEXT_TELEMETRY_DISABLED=1 \
      -e BUILD_APP="$BUILD_APP" \
      ${E2E_IMAGE} bash -c 'export PATH="$(pwd)/node_modules/.bin":$PATH; corepack npm run test:e2e'
else
   echo "no playwright.config.js found - skipping tests...";
fi;

echo "= "
echo "======================================"
