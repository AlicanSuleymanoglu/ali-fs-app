ARG NODEJS_VERSION=20.19.0
ARG ALPINE_VERSION=3.21
ARG SECRETS_INIT_IMAGE=europe-docker.pkg.dev/iac-dev-432418/allo-docker/allo/secrets-init:0.5.3-alpine
ARG NODEJS_ALPINE_BASE_IMAGE=node:${NODEJS_VERSION}-alpine${ALPINE_VERSION}


#
# ---- Secrets Init -  ----   ----   ----   ----   ----   ----   ----   ----   ----   ----   ----
FROM ${SECRETS_INIT_IMAGE} AS secrets-init



#
# ---- Base Node ----  ----   ----   ----   ----   ----   ----   ----   ----   ----   ----   ----
FROM ${NODEJS_ALPINE_BASE_IMAGE} AS base



#
# ---- Runner -- ----  ----   ----   ----   ----   ----   ----   ----   ----   ----   ----   ----
FROM base AS runner

RUN   apk add --no-cache \
         bash \
         tini \
         libstdc++ dumb-init \
      && rm -rf /tmp/* \
      && rm -rvf /var/cache/* \
      # no need in --no-cache option above as we need to reuse APKINDEX and we delete afterwards with rm:
      && rm -fv /var/cache/apk/*

# Don't run production as root
RUN   addgroup --system --gid 1001 allo
RUN   adduser --system --uid 1001 allo

WORKDIR /app

COPY  --from=secrets-init --chown=allo:allo --chmod=0755  /secrets-init ./secrets-init

ARG BUILD_APP=xyz
ENV BUILD_APP=$BUILD_APP
ENV NEXT_TELEMETRY_DISABLED=1

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY  --link --chown=allo:allo apps/$BUILD_APP/dist ./dist
#COPY  --link --chown=allo:allo apps/$BUILD_APP/.next/standalone/apps/$BUILD_APP/.next/static ./next/standalone/apps/$TURBO_APP/.next/static
#COPY  --link --chown=allo:allo apps/$BUILD_APP/.next/standalone/apps/$BUILD_APP/public ./next/standalone/apps/$TURBO_APP/public


USER allo

EXPOSE 3000
ENV PORT=3000

ENV HOSTNAME="0.0.0.0"

# wrapper can be any installed tool like:
# /sbin/tini
# /usr/bin/dumb-init
# /app/secrets-init --provider google --exit-early
ARG WRAPPER="/app/secrets-init --provider google --exit-early"
ENV WRAPPER=$WRAPPER

ENTRYPOINT [ "/bin/bash", "-c", "${WRAPPER[@]} \"${@}\"", "--"]
CMD printenv && node dist/server.js