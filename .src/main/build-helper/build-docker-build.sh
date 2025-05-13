#!/bin/bash
#set -euxo pipefail
set -e

BUILD_IMAGE="${BUILD_IMAGE:-europe-docker.pkg.dev/iac-dev-432418/allo-docker/allo/node:20-slim-corepack-turbo}"

test -t 0 && DOCKER_USE_TTY="-it"

echo "======================================"
echo "= npm run build --filter=$BUILD_APP"
echo "= "
docker run ${DOCKER_USE_TTY} --rm \
    -u $(id -u ${USER}):$(id -g ${USER}) \
    -v "$(pwd)":"$(pwd)"  \
    -w "$(pwd)" \
    -e BUILD_APP="$BUILD_APP" \
    --entrypoint /bin/bash \
    ${BUILD_IMAGE} -c 'export PATH="$(pwd)/node_modules/.bin":$PATH; echo $PATH; corepack npm run build --filter=$BUILD_APP...'
echo "= "
echo "======================================"
