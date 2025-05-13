#!/bin/bash
#set -euxo pipefail
set -e

current=$(date +%s);
last_modified=$(stat -c "%Y" ".npmrc" || echo 0);
test -t 0 && DOCKER_USE_TTY="-it"

if [ -z "$( ls -A .npmrc )" ] || [ $((current - last_modified)) -gt 3600 ]; then
  echo "======================================"
  echo "= .npmrc"
  docker run ${DOCKER_USE_TTY} --rm \
	-u $(id -u ${USER}):$(id -g ${USER}) \
	-v "$(pwd)":"$(pwd)"  \
	-w "$(pwd)" \
    -v "${HOME}/.gitconfig":"/home/node/.gitconfig" \
    -e JS_BUILD_CUSTOM_SCOPE_REGISTRY_GCLOUD_PROJECT=endless-gizmo-264508 \
    -e JS_BUILD_CUSTOM_SCOPE_REGISTRY_AUTHTOKEN=$(gcloud auth print-access-token --project=endless-gizmo-264508) \
    -e JS_BUILD_REGISTRY_GCLOUD_PROJECT=iac-dev-432418 \
    -e JS_BUILD_REGISTRY_AUTHTOKEN=$(gcloud auth print-access-token --project=iac-dev-432418) \
    -e JS_BUILD_PREFER_CUSTOM_REGISTRY="" \
    --entrypoint /bin/bash \
   europe-docker.pkg.dev/iac-dev-432418/allo-docker/allo/node:20-slim-corepack-turbo '.src/main/build-helper/build-setup-only.sh'
  echo "= "
  echo "======================================"
fi
