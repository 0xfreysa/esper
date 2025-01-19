#!/bin/sh

nitriding -fqdn notary.freysa.ai -appwebsrv http://127.0.0.1:7047 -ext-pub-port 443 -intport 8080 &
echo "[sh] Started nitriding."

sleep 1

/app/notary-server --config-file /app/config/config.yaml
echo "[sh] Started notary server."
