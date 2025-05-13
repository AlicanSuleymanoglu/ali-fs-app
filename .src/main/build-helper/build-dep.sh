#!/bin/bash
#set -euxo pipefail
set -e
echo "$@"

DIR=`pwd`
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
export COREPACK_INTEGRITY_KEYS=0

export JS_BUILD_PREFER_CUSTOM_REGISTRY="${JS_BUILD_PREFER_CUSTOM_REGISTRY:-}"
export JS_BUILD_DEFAULT_REGISTRY="${JS_BUILD_DEFAULT_REGISTRY:-https://registry.npmjs.org}"


export JS_BUILD_CUSTOM_SCOPE="${JS_BUILD_CUSTOM_SCOPE:-allo}"
export JS_BUILD_CUSTOM_SCOPE_REGISTRY_GCLOUD_PROJECT="${JS_BUILD_CUSTOM_SCOPE_REGISTRY_GCLOUD_PROJECT:-endless-gizmo-264508}"
export JS_BUILD_CUSTOM_SCOPE_REGISTRY="${JS_BUILD_CUSTOM_SCOPE_REGISTRY:-https://europe-npm.pkg.dev/$JS_BUILD_CUSTOM_SCOPE_REGISTRY_GCLOUD_PROJECT/allo-npm}"
#export JS_BUILD_CUSTOM_SCOPE_REGISTRY_AUTHTOKEN="${JS_BUILD_CUSTOM_SCOPE_REGISTRY_AUTHTOKEN:-$(gcloud auth print-access-token --project=$JS_BUILD_CUSTOM_SCOPE_REGISTRY_GCLOUD_PROJECT)}"


export JS_BUILD_REGISTRY_GCLOUD_PROJECT="${JS_BUILD_REGISTRY_GCLOUD_PROJECT:-endless-gizmo-264508}"
export JS_BUILD_REGISTRY="${JS_BUILD_REGISTRY:-https://europe-west3-npm.pkg.dev/$JS_BUILD_REGISTRY_GCLOUD_PROJECT/registry-npmjs-org}"
#export JS_BUILD_REGISTRY_AUTHTOKEN="${JS_BUILD_REGISTRY_AUTHTOKEN:-$(gcloud auth print-access-token --project=$JS_BUILD_REGISTRY_GCLOUD_PROJECT)}"


if ! cat package.json | grep nodeLinker | grep -q node-modules; then echo "nodeLinker not set to node-modules in package.json - aborting." && exit 1; fi
if ! cat package.json | grep -q packageManager; then echo "packageManager not in package.json - aborting." && exit 1; fi


#$SCRIPT_DIR/build-setup-only.sh


if [ -f yarn.lock ]; then 
	if $(cat package.json | grep packageManager | grep yarn | grep -q "@1"); then 
		yarn --frozen-lockfile;
	elif $(cat package.json | grep packageManager | grep yarn | grep -q "@4"); then 
		yarn --immutable;
	fi		

elif [ -f package-lock.json ]; then 
	numberOfCustomRegistryEntries=$(cat package-lock.json | grep "$JS_BUILD_REGISTRY" | wc -l || true)
	numberOfDefaultRegistryEntries=$(cat package-lock.json | grep "$JS_BUILD_DEFAULT_REGISTRY" | wc -l || true)

	if [[ -n "$JS_BUILD_PREFER_CUSTOM_REGISTRY" ]]; then
		if [[ "$numberOfCustomRegistryEntries" -lt "$numberOfDefaultRegistryEntries" ]]; then
			echo "package-lock.json please check your package-lock.json - its not in line with your JS_BUILD_PREFER_CUSTOM_REGISTRY setting (custom registry entries $numberOfCustomRegistryEntries > $numberOfDefaultRegistryEntries default registry entries)"
			exit 1
		fi
	fi

	packageLockFile="package-lock.json"
	LOCK_SHA256_HASH=$( sha256sum $packageLockFile | awk '{ print $1 }')
	echo "Current sha256 hash is $LOCK_SHA256_HASH"
	echo "Checking sha256 hash of $packageLockFile"
	if ! sha256sum -c "$packageLockFile.sha256sum"; then
	    echo "$packageLockFile checksum does not match cache run npm ci"
		corepack npm ci --cache .npm --prefer-offline --no-audit --no-fund --location project;
        sha256sum "$packageLockFile" > "$packageLockFile.sha256sum";
	fi

elif [ -f pnpm-lock.yaml ]; then 
	echo "package manager to use not supported yet in package.json - aborting.";
	exit 1;
	#corepack enable pnpm;
	#pnpm i --frozen-lockfile;
else
	echo "Lockfile not found.";
	if $(cat package.json | grep packageManager | grep yarn | grep -q "@1"); then 
		yarn;
	elif $(cat package.json | grep packageManager | grep yarn | grep -q "@4"); then 
		yarn;
	elif $(cat package.json | grep packageManager | grep -q pnpm); then 
		pnpm i;
	elif $(cat package.json | grep packageManager | grep -q npm); then
		corepack npm install --cache .npm --prefer-offline --no-audit --no-fund --location project;
		packageLockFile="package-lock.json"
		sha256sum "$packageLockFile" > "$packageLockFile.sha256sum";
	else 
		echo "package manager to use not defined in package.json - aborting.";
		exit 1;
	fi
fi
