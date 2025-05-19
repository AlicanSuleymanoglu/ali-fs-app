#!/bin/bash
#set -euxo pipefail
set -e

DATETIME=$(date +"%Y%m%d_%H%M")
HOST=$(hostname -s)
DOMAIN=$(hostname -d)
USER=$(whoami)
USER_UID=$(id -u ${USER})
USER_GID=$(id -g ${USER})
#SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
DIR_BASENAME=$(basename "$0")
DIR_DIRNAME=$(dirname "$0")
#DIR_SCRIPT=$(dirname "$(readlink -f "$(type -P $0 || echo $0)")")
DIR=`pwd`

#https://stackoverflow.com/questions/59895/how-do-i-get-the-directory-where-a-bash-script-is-located-from-within-the-script
#https://stackoverflow.com/questions/29832037/how-to-get-script-directory-in-posix-sh
if [ -f "$0" ]; then script=$0; else script=$(command -v -- "$0"); fi
DIR_SCRIPT=$(dirname -- "$script")
DIR_SCRIPT=$(CDPATH=; cd -- "$DIR_SCRIPT" && pwd -P)

test -t 0 && DOCKER_USE_TTY="-it"

DOCKER_RUNTIME_FILE="${DOCKER_RUNTIME_FILE:-.src/main/docker/Dockerfile.runtime.vite}"
E2E_IMAGE="${E2E_IMAGE:-europe-west3-docker.pkg.dev/iac-dev-432418/mcr-microsoft-com/playwright:v1.52.0-noble}"
BUILD_IMAGE="${BUILD_IMAGE:-europe-docker.pkg.dev/iac-dev-432418/allo-docker/allo/node:20-slim-corepack-turbo}"

packageLockFile="package-lock.json"

echo "------------------------------------"
echo "-"
echo "pwd                 : [$DIR]"
echo "basename            : [$DIR_BASENAME]"
echo "dirname             : [$DIR_DIRNAME]"
echo "dirname/readlink    : [$DIR_SCRIPT]"
echo "DATETIME            : [$DATETIME]"
echo "HOST                : [$HOST]"
echo "DOMAIN              : [$DOMAIN]"
echo "USER                : [$USER]"
echo "USER_UID            : [$USER_UID]"
echo "USER_GID            : [$USER_GID]"
echo "DOCKER_USE_TTY      : [$DOCKER_USE_TTY]"
echo "DOCKER_RUNTIME_FILE : [$DOCKER_RUNTIME_FILE]"
echo "BUILD_IMAGE         : [$BUILD_IMAGE]"
echo "-"
echo "------------------------------------"


# ------------------------------------------------------

rm -rf node_modules
rm -rf .next
rm -rf .turbo

rm -rf apps/salea-frontend/node_modules
rm -rf apps/salea-frontend/.next
rm -rf apps/salea-frontend/.turbo

rm -rf apps/salea-backend/node_modules
rm -rf apps/salea-backend/.next
rm -rf apps/salea-backend/.turbo

# ------------------------------------------------------

docker pull ${BUILD_IMAGE} 
#docker build --rm \
#  -t node:20-slim-corepack-turbo \
#  -f .src/main/docker/Dockerfile.build-node20-corepack-turbo \
#  .

export BUILD_APP="${BUILD_APP:-kiosk}"
export BUILD_APP_IMAGE="${BUILD_APP_IMAGE:-test$BUILD_APP}"

OUTPUT_FOLDER="out/$BUILD_APP"
mkdir -p ${OUTPUT_FOLDER}

echo "======================================"
echo "= AUTHENTICATE"
echo "= "
./.src/main/build-helper/build-docker-setup-only.sh
echo "= "
echo "======================================"


echo "======================================"
echo "= dependencies on root level"
echo "= "
if [[ ! -f "$packageLockFile.sha256sum" ]] || ! sha256sum -c "$packageLockFile.sha256sum";then
    ./.src/main/build-helper/build-docker-dep.sh
    find . -type f -name "package*.json" | grep -v "/out/" | grep -v node_modules | sort | xargs sha256sum > "$packageLockFile.sha256sum";
fi
echo "= "
echo "======================================"



echo "======================================"
echo "= TURBO PRUNE"
echo "= "
mkdir -p ${OUTPUT_FOLDER}/full
cd $OUTPUT_FOLDER/full
rm -rf apps/$OUTPUT_FOLDER/src
rm -rf apps/$OUTPUT_FOLDER/public
cd $DIR

docker run ${DOCKER_USE_TTY} --rm \
  -u $(id -u ${USER}):$(id -g ${USER}) \
  -v "$(pwd)":"$(pwd)"  \
  -w "$(pwd)" \
  -e BUILD_APP="$BUILD_APP" \
  -e OUTPUT_FOLDER="$OUTPUT_FOLDER" \
  --entrypoint /bin/bash \
  ${BUILD_IMAGE} -c 'turbo prune $BUILD_APP --docker --include-dependencies --out-dir "$OUTPUT_FOLDER";'
echo "= "
echo "======================================"



echo "======================================"
echo "= AUTHENTICATE"
echo "= "
cd $DIR
cp -r .src "$OUTPUT_FOLDER/full"
cp .npmrc "$OUTPUT_FOLDER/full"
echo "= "
echo "======================================"



echo "======================================"
echo "= dependencies optimized"
echo "= "
LOCK_SHA256_HASH=$( sha256sum $packageLockFile | awk '{ print $1 }')
echo "Current sha256 hash is $LOCK_SHA256_HASH"
echo "Checking sha256 hash of $packageLockFile"
if [[ ! -f "$packageLockFile.sha256sum" ]] || ! sha256sum -c "$packageLockFile.sha256sum";then
    rm -rf "$OUTPUT_FOLDER/full/$packageLockFile"
    rm -rf "$OUTPUT_FOLDER/full/$packageLockFile.sha256sum"
fi

cd $OUTPUT_FOLDER/full
if [[ ! -f "$packageLockFile.sha256sum" ]] || ! sha256sum -c "$packageLockFile.sha256sum";then
    ./.src/main/build-helper/build-docker-dep.sh
fi
cd $DIR

if [[ ! -f "$packageLockFile.sha256sum" ]] || ! sha256sum -c "$packageLockFile.sha256sum";then
    find . -type f -name "package*.json" | grep -v "/out/" | grep -v node_modules | sort | xargs sha256sum > "$packageLockFile.sha256sum";
fi
echo "= "
echo "======================================"


cd $OUTPUT_FOLDER/full
./.src/main/build-helper/build-docker-build.sh

#mkdir -p apps/$BUILD_APP/.next/standalone/apps/$BUILD_APP/.next/static
#cp -r apps/$BUILD_APP/.next/static apps/$BUILD_APP/.next/standalone/apps/$BUILD_APP/.next
#mkdir -p apps/$BUILD_APP/.next/standalone/apps/$BUILD_APP/.next/public
#cp -r apps/$BUILD_APP/public apps/$BUILD_APP/.next/standalone/apps/$BUILD_APP

./.src/main/build-helper/build-docker-test.sh


docker build --rm \
    --build-arg BUILD_APP="$BUILD_APP" \
    --build-arg TURBO_APP="$BUILD_APP" \
    --build-arg APP_SOURCE_DIRECTORY="apps/$BUILD_APP" \
    -t "$BUILD_APP_IMAGE" \
    -f "apps/$BUILD_APP/.docker/Dockerfile" \
    .

cd $DIR

if [ ! -z ${BUILD_APP_IMAGE_PUSH+x} ]; then
	docker push \
		"$BUILD_APP_IMAGE"
fi
