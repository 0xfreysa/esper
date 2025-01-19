#!/bin/bash

DIRECTORY="./wasm/prover/target"
FORCE_FLAG=0

# Check if --force or -f flag is passed
for arg in "$@"
do
    if [ "$arg" == "--force" ] || [ "$arg" == "-f" ]
    then
        FORCE_FLAG=1
        break
    fi
done

# If force flag is set, remove the directories/files and run the npm command
if [ $FORCE_FLAG -eq 1 ]
then
    echo "Force flag detected, removing directories and files."
    rm -rf ./wasm/prover/pkg
    rm -rf ./wasm/prover/target
    rm -f ./wasm/prover/Cargo.lock
    echo "Running npm run build:wasm"
    npm run build:wasm
# If the directory does not exist or is empty, run the npm command
elif [ ! -d "$DIRECTORY" ] || [ -z "$(ls -A $DIRECTORY)" ]
then
    echo "Running npm run build:wasm"
    npm run build:wasm
else
    echo "$DIRECTORY exists and is not empty."
fi