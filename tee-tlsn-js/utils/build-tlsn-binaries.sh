#!/bin/bash
# Run tlsn Server fixture

# Set the directory to the location of the script
cd "$(dirname "$0")"

# Name of the directory where the repo will be cloned
REPO_DIR="tlsn"

# Check if the directory exists
if [ ! -d "$REPO_DIR" ]; then
    # Clone the repository if it does not exist
    git clone https://github.com/tlsnotary/tlsn.git "$REPO_DIR"
    cd "$REPO_DIR"
else
    # If the directory exists, just change to it
    cd "$REPO_DIR"
    # Fetch the latest changes in the repo without checkout
    git fetch
fi

# Checkout the specific tag
git checkout "v0.1.0-alpha.6"

for dir in "tlsn/tlsn-server-fixture/" "notary/server"; do
    # Change to the specific subdirectory
    cd ${dir}

    # Build the project
    cargo build --release
    cd -
done
