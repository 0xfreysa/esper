
FROM golang:1.23 AS builder_nitriding

WORKDIR /

COPY  start.sh /bin/
RUN chown root:root  /bin/start.sh
RUN chmod 0755       /bin/start.sh


RUN git clone https://github.com/brave/nitriding-daemon.git
ARG TARGETARCH
RUN ARCH=${TARGETARCH} make -C nitriding-daemon/ nitriding


FROM rust:bookworm AS builder_notary
RUN rustup default 1.85.0

WORKDIR /usr/src/tlsn
COPY . .
RUN pwd && echo "Current path logged"  # Added this line to log the current path

RUN cargo install --path crates/notary/server

FROM ubuntu:latest
WORKDIR /root/app

RUN mkdir -p /app/fixture/tls /app/config

COPY ./crates/notary/server/fixture /app/fixture/
COPY ./crates/notary/server/config/config_production.yaml /app/config/config.yaml
COPY ./keys/tls.crt /app/fixture/tls/notary.crt
COPY ./keys/tls.key /app/fixture/tls/notary.key
COPY ./keys/notary_pkey.pem /app/fixture/notary/notary.key
COPY ./providers.json /app/providers.json

RUN ls -laR /app

COPY --from=builder_notary /usr/local/cargo/bin/notary-server /app/
COPY --from=builder_nitriding /nitriding-daemon/nitriding /bin/start.sh /bin/

RUN apt-get update && apt-get -y upgrade && apt-get install -y --no-install-recommends \
    pkg-config \
    libssl-dev \
    ca-certificates \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Label to link this image with the repository in Github Container Registry (https://docs.github.com/en/packages/learn-github-packages/connecting-a-repository-to-a-package#connecting-a-repository-to-a-container-image-using-the-command-line)
LABEL org.opencontainers.image.source=https://github.com/tlsnotary/tlsn
LABEL org.opencontainers.image.description="An implementation of the notary server in Rust."

ENV RUN_IN_CONTAINER="True"

CMD ["start.sh"]