#!/bin/bash
#set -euxo pipefail
set -e

BUILD_IMAGE="${BUILD_IMAGE:-europe-docker.pkg.dev/iac-dev-432418/allo-docker/allo/node:20-slim-corepack-turbo}"

test -t 0 && DOCKER_USE_TTY="-it"

echo "======================================"
echo "= dependencies"

packageLockFile="package-lock.json"
LOCK_SHA256_HASH=$( sha256sum $packageLockFile | awk '{ print $1 }')
echo "Current saved sha256 hash is $LOCK_SHA256_HASH - checking sha256 hash of $packageLockFile"
if ! sha256sum -c "$packageLockFile.sha256sum"; then
  docker run ${DOCKER_USE_TTY} --rm \
    -u $(id -u ${USER}):$(id -g ${USER}) \
    -v "$(pwd)":"$(pwd)"  \
    -w "$(pwd)" \
    -v "${HOME}/.gitconfig":"/home/node/.gitconfig" \
    -e JS_BUILD_REGISTRY_GCLOUD_PROJECT=iac-dev-432418 \
    -e JS_BUILD_CUSTOM_SCOPE_REGISTRY_GCLOUD_PROJECT=iac-dev-432418 \
    -e JS_BUILD_PREFER_CUSTOM_REGISTRY="" \
    --entrypoint /bin/bash \
    ${BUILD_IMAGE} '.src/main/build-helper/build-dep.sh'

  if ! sha256sum -c "$packageLockFile.sha256sum"; then
    sha256sum "$packageLockFile" > "$packageLockFile.sha256sum";
    echo "updated sha256 of $packageLockFile"
  fi
fi

echo "= "
echo "======================================"
