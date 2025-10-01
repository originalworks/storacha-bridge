FROM node:22.14-bookworm

ARG UID=1000
ARG GID=1000

RUN \
    groupmod -g "${GID}" node && \
    usermod -u "${UID}" -g "${GID}" node && \
    mkdir -p /app && \
    chown -R node:node /app /home/node

WORKDIR /app
