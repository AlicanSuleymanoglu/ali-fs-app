#ARG NGINX_BASE_IMAGE="docker.io/library/nginx-1.27.4-debian-vts"
ARG NGINX_BASE_IMAGE="europe-west3-docker.pkg.dev/iac-dev-432418/registry-docker-io/nginxinc/nginx-unprivileged"


#
# ---- Base Image ---  ----   ----   ----   ----   ----   ----   ----   ----   ----   ----   ----
FROM ${NGINX_BASE_IMAGE} AS base

ARG APP_DIRECTORY=""
ENV APP_DIRECTORY=$APP_DIRECTORY

ARG APP_SOURCE_DIRECTORY=""
ENV APP_SOURCE_DIRECTORY=$APP_SOURCE_DIRECTORY

ARG APP_TARGET_DIRECTORY=""
ENV APP_TARGET_DIRECTORY=$APP_TARGET_DIRECTORY

RUN \
    rm -rf /etc/nginx/conf.d/*

COPY $APP_SOURCE_DIRECTORY/dist "/usr/share/nginx/html$APP_TARGET_DIRECTORY"
COPY .src/main/docker/3000-vite.conf /etc/nginx/conf.d/3000.conf

COPY --chmod=0755 $APP_SOURCE_DIRECTORY/.docker/env.sh /docker-entrypoint.d/env.sh

EXPOSE 3000

#RUN printenv

#RUN \
#  printf "allo:$(openssl passwd -5 allo2025)\n" >> /etc/nginx/.htpasswd
