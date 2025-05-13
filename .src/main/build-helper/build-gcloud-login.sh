#!/bin/bash
set -euxo pipefail
echo "$@"


gcloud auth login ${GCLOUD_PROJECT_USER}
gcloud config set project ${GCLOUD_PROJECT}
gcloud auth application-default login
gcloud auth configure-docker europe-docker.pkg.dev,europe-west3-docker.pkg.dev,europe-west4-docker.pkg.dev
