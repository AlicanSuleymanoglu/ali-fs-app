#!/bin/bash
# For this example we will just create a access token using gcloud substitute with your own approach
#token=$(gcloud auth print-access-token)
token=$(cat $1)
# base64 encode the username and password 
docker_token=$(echo -n "gclouddockertoken:$token" | base64 | tr -d "\n")
#Create Docker config.json with the credentials

cat > $2 <<- EndOfMessage
{
  "auths": {
    "gcr.io": {
      "auth": "$docker_token",
      "email": "not@val.id"
    },
    "us.gcr.io": {
      "auth": "$docker_token",
      "email": "not@val.id"
    },
    "eu.gcr.io": {
      "auth": "$docker_token",
      "email": "not@val.id"
    },
    "europe-docker.pkg.dev": {
      "auth": "$docker_token",
      "email": "not@val.id"
    },
    "europe-west3-docker.pkg.dev": {
      "auth": "$docker_token",
      "email": "not@val.id"
    },
    "asia.gcr.io": {
      "auth": "$docker_token",
      "email": "not@val.id"
    },
    "staging-k8s.gcr.io": {
      "auth": "$docker_token",
      "email": "not@val.id"
    },
    "marketplace.gcr.io": {
      "auth": "$docker_token",
      "email": "not@val.id"
    }
  }
}
EndOfMessage