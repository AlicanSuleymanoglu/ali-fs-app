#!/bin/bash
set -euxo pipefail
echo "$@"

DIR=`pwd`

export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
export COREPACK_INTEGRITY_KEYS=0

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

yarn1_setup() {
	corepack enable yarn;
    
	if [[ -n "$JS_BUILD_PREFER_CUSTOM_REGISTRY" ]]; then
		registry=$(echo "$JS_BUILD_REGISTRY" | sed 's#/*$##');
		registry_host=$(echo "$registry" | sed 's#https://##' | sed 's#/*$##');

		corepack yarn config set registry "$registry/" --location project;

		# TODO: for whatever fu** reason - yarn 1 config set of the auth token does not work but npm config set works ...
	    corepack yarn config set "//${registry_host}/:_authToken" "$JS_BUILD_REGISTRY_AUTHTOKEN" --location project;
	    export COREPACK_ENABLE_STRICT=0 
	    corepack npm config set "//${registry_host}/:_authToken" "$JS_BUILD_REGISTRY_AUTHTOKEN" --location project;
	    export COREPACK_ENABLE_STRICT=1
	else 
		registry=$(echo "$JS_BUILD_DEFAULT_REGISTRY" | sed 's#/*$##');
		registry_host=$(echo "$registry" | sed 's#https://##' | sed 's#/*$##');

		# TODO: for whatever fu** reason - yarn 1 config set of the auth token does not work but npm config set works ...
		corepack yarn config set registry "$registry/" --location project;
		corepack yarn config delete "//${registry_host}/:_authToken" --location project;
	    export COREPACK_ENABLE_STRICT=0
	    corepack npm config delete "//${registry_host}/:_authToken" --location project;
	    export COREPACK_ENABLE_STRICT=1
	fi

	registry=$(echo "$JS_BUILD_CUSTOM_SCOPE_REGISTRY" | sed 's#/*$##');
	corepack yarn config set "@$JS_BUILD_CUSTOM_SCOPE:registry" "$registry/" --location project;
    registry_host=$(echo "$JS_BUILD_CUSTOM_SCOPE_REGISTRY" | sed 's#https://##' | sed 's#/*$##');

	# TODO: for whatever fu** reason - yarn 1 config set of the auth token does not work but npm config set works ...
    corepack yarn config set "//${registry_host}/:_authToken" "$JS_BUILD_CUSTOM_SCOPE_REGISTRY_AUTHTOKEN" --location project;
    export COREPACK_ENABLE_STRICT=0 
    corepack npm config set "//${registry_host}/:_authToken" "$JS_BUILD_CUSTOM_SCOPE_REGISTRY_AUTHTOKEN" --location project;
    export COREPACK_ENABLE_STRICT=1
}

yarn4_setup() {
	corepack enable yarn;
	
	if [[ -n "$JS_BUILD_PREFER_CUSTOM_REGISTRY" ]]; then
		registry=$(echo "$JS_BUILD_REGISTRY" | sed 's#/*$##');
		corepack yarn config set --json 'npmAuthToken' "\"$JS_BUILD_REGISTRY_AUTHTOKEN\"";
		corepack yarn config set --json 'npmAlwaysAuth' "true";
		corepack yarn config set --json 'npmRegistryServer' "\"$registry\"";
	else 
		registry=$(echo "$JS_BUILD_DEFAULT_REGISTRY" | sed 's#/*$##');
		corepack yarn config unset npmAuthToken;
		corepack yarn config unset npmAlwaysAuth;
		corepack yarn config set --json 'npmRegistryServer' "\"$registry\"";
	fi
	registry=$(echo "$JS_BUILD_CUSTOM_SCOPE_REGISTRY" | sed 's#/*$##');
	corepack yarn config set --json "npmScopes.$JS_BUILD_CUSTOM_SCOPE.npmAuthToken" "\"$JS_BUILD_CUSTOM_SCOPE_REGISTRY_AUTHTOKEN\"";
    corepack yarn config set --json "npmScopes.$JS_BUILD_CUSTOM_SCOPE.npmAlwaysAuth" "true";
    corepack yarn config set --json "npmScopes.$JS_BUILD_CUSTOM_SCOPE.npmRegistryServer" "\"$registry\"";
    corepack yarn config set nodeLinker node-modules;
}

npm_setup() {
	if [[ -n "$JS_BUILD_PREFER_CUSTOM_REGISTRY" ]]; then
		registry=$(echo "$JS_BUILD_REGISTRY" | sed 's#/*$##');
	    registry_host=$(echo "$registry" | sed 's#https://##' | sed 's#/*$##');

		corepack npm config set registry "$registry/" --location project;
	    corepack npm config set "//${registry_host}/:_authToken" "$JS_BUILD_REGISTRY_AUTHTOKEN" --location project;
	else 
		registry=$(echo "$JS_BUILD_DEFAULT_REGISTRY" | sed 's#/*$##');
	    registry_host=$(echo "$registry" | sed 's#https://##' | sed 's#/*$##');
		corepack npm config set registry "$registry/" --location project;
	    corepack npm config delete "//${registry_host}/:_authToken" --location project;
	fi
	registry=$(echo "$JS_BUILD_CUSTOM_SCOPE_REGISTRY" | sed 's#/*$##');
	corepack npm config set "@$JS_BUILD_CUSTOM_SCOPE:registry" "$registry/" --location project;
    registry_host=$(echo "$JS_BUILD_CUSTOM_SCOPE_REGISTRY" | sed 's#https://##' | sed 's#/*$##');
    corepack npm config set "//${registry_host}/:_authToken" "$JS_BUILD_CUSTOM_SCOPE_REGISTRY_AUTHTOKEN" --location project;

	export COREPACK_NPM_REGISTRY=$(npm config get registry --location project)
	corepack npm config fix --location project;
}




if [ -f yarn.lock ]; then 
	if $(cat package.json | grep packageManager | grep yarn | grep -q "@1"); then 
		yarn1_setup
		yarn --frozen-lockfile;
	elif $(cat package.json | grep packageManager | grep yarn | grep -q "@4"); then 
		yarn4_setup
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

	npm_setup

elif [ -f pnpm-lock.yaml ]; then 
		echo "package manager to use not supported yet in package.json - aborting.";
		exit 1;
else
	echo "Lockfile not found.";
	if $(cat package.json | grep packageManager | grep yarn | grep -q "@1"); then 
		yarn1_setup
	elif $(cat package.json | grep packageManager | grep yarn | grep -q "@4"); then 
		yarn4_setup
	elif $(cat package.json | grep packageManager | grep -q pnpm); then 
		corepack enable pnpm;
	elif $(cat package.json | grep packageManager | grep -q npm); then
		npm_setup
	else 
		echo "package manager to use not defined in package.json - aborting.";
		exit 1;
	fi
fi
