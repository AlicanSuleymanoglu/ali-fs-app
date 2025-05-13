#!/bin/bash
set -euxo pipefail
echo "$@"

DIR=`pwd`
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

export COREPACK_ENABLE_DOWNLOAD_PROMPT=0

export JS_BUILD_PREFER_CUSTOM_REGISTRY="${JS_BUILD_PREFER_CUSTOM_REGISTRY:-}"
export JS_BUILD_DEFAULT_REGISTRY="${JS_BUILD_DEFAULT_REGISTRY:-https://registry.npmjs.org}"


export JS_BUILD_CUSTOM_SCOPE="${JS_BUILD_CUSTOM_SCOPE:-allo}"
export JS_BUILD_CUSTOM_SCOPE_REGISTRY_GCLOUD_PROJECT="${JS_BUILD_CUSTOM_SCOPE_REGISTRY_GCLOUD_PROJECT:-endless-gizmo-264508}"
export JS_BUILD_CUSTOM_SCOPE_REGISTRY="${JS_BUILD_CUSTOM_SCOPE_REGISTRY:-https://europe-npm.pkg.dev/$JS_BUILD_CUSTOM_SCOPE_REGISTRY_GCLOUD_PROJECT/allo-npm}"
export JS_BUILD_CUSTOM_SCOPE_REGISTRY_AUTHTOKEN="${JS_BUILD_CUSTOM_SCOPE_REGISTRY_AUTHTOKEN:-$(gcloud auth print-access-token --project=$JS_BUILD_CUSTOM_SCOPE_REGISTRY_GCLOUD_PROJECT)}"


export JS_BUILD_REGISTRY_GCLOUD_PROJECT="${JS_BUILD_REGISTRY_GCLOUD_PROJECT:-endless-gizmo-264508}"
export JS_BUILD_REGISTRY="${JS_BUILD_REGISTRY:-https://europe-west3-npm.pkg.dev/$JS_BUILD_REGISTRY_GCLOUD_PROJECT/registry-npmjs-org}"
export JS_BUILD_REGISTRY_AUTHTOKEN="${JS_BUILD_REGISTRY_AUTHTOKEN:-$(gcloud auth print-access-token --project=$JS_BUILD_REGISTRY_GCLOUD_PROJECT)}"


if ! cat package.json | grep nodeLinker | grep -q node-modules; then echo "nodeLinker not set to node-modules in package.json - aborting." && exit 1; fi
if ! cat package.json | grep -q packageManager; then echo "packageManager not in package.json - aborting." && exit 1; fi


$SCRIPT_DIR/build-setup-only.sh



if [ -f yarn.lock ]; then 
	yarn "$@";
elif [ -f package-lock.json ]; then
	corepack npm "$@" --cache .npm --prefer-offline --location project;
elif [ -f pnpm-lock.yaml ]; then 
	corepack enable pnpm
	pnpm "$@";
else echo "Lockfile not found." && exit 1;
fi
