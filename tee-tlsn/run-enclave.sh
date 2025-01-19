#!/bin/bash

image_eif="$1"
debug_mode="$2"


echo "[ec2] Starting enclave."

if [ "$debug" = "--debug" ]
then
	echo "[ec2] Running enclave in debug mode."
	nitro-cli run-enclave \
		--cpu-count 2 \
		--memory 3072 \
		--enclave-cid 4 \
		--eif-path "$image_eif" \
		--debug-mode \
		--attach-console
else
	echo "[ec2] Running enclave in production mode."
	nitro-cli run-enclave \
		--cpu-count 2 \
		--memory 3072 \
		--enclave-cid 4 \
		--eif-path "$image_eif"
fi


