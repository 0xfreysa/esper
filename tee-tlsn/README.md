# Freysa TLSNotary

Freysa TLSNotary is a protocol that allows user to get their internet TLS data attested by a notary server.
To respect user privacy, notary server is supposed to run in a TEE (Trusted Execution Environment).

## Note
Note: This is a fork of the [TLSNotary project](https://tlsnotary.org) with important changes, namely:
- The MPC scheme is discarded.
- The notary lives instead in a TEE to provide privacy guarantees.

This repository contains various crates, the most important ones are:

- [notary](./crates/notary/): Implements the notary server
- [wasm](./crates/verifier/): Implements the client component, has to be compiled to WASM


## Run notary locally

```
cd crates/notary/server
cargo run
```

To test the local notary, in extension go to settings to change the notary url to `http://localhost:7047`

### Run with docker

The dockerfile expect a 'tls' folder with TLS certificates at the root of the repository.
You can rename 'tls-example' to 'tls' for testing purposes.

```
cp ../providers.json ./providers.json
docker build --build-arg CONFIG_FILE=config_production.yaml -t notary-test .
docker run -p 7047:7047  notary-test
```

## Notary config file and providers

The notary config file allows you to set the list of providers (websites), notary signing key, TLS certificates path, and also the port of the notary server.

The providers are defined in the [providers.json](./crates/notary/server/providers.json) file. They defined how to extract and process data from TLS responses to produce attested atributes.

The [config.yaml](./crates/notary/server/config/config.yaml) file points to the providers path.
 
You can test the providers parsing function in the unit tests in [provider.rs](./crates/verifier/src/provider.rs) module.

## Deploy notary server on TEE

See [DEPLOY.md](./DEPLOY.md) for deployment instructions.

## Build WASM for chrome extension

```
cd crates/wasm
./build.sh
```

Then move the output to tee-tlsn-js/wasm/pkg

## Run websockify server

The extension needs to go through to a websockify server to exchange data with the notary server.

 (TBD)

```
docker build -t websockify .
docker run -p 55688:55688 websockify
```

## Development


> [!IMPORTANT]
> **Note on Rust-to-WASM Compilation**: This project requires compiling Rust into WASM, which needs [`clang`](https://clang.llvm.org/) version 16.0.0 or newer. MacOS users, be aware that Xcode's default `clang` might be older. If you encounter the error `No available targets are compatible with triple "wasm32-unknown-unknown"`, it's likely due to an outdated `clang`. Updating `clang` to a newer version should resolve this issue.
> 
> For MacOS aarch64 users, if Apple's default `clang` isn't working, try installing `llvm` via Homebrew (`brew install llvm`). You can then prioritize the Homebrew `clang` over the default macOS version by modifying your `PATH`. Add the following line to your shell configuration file (e.g., `.bashrc`, `.zshrc`):
> ```sh
> export PATH="/opt/homebrew/opt/llvm/bin:$PATH"
> ```

If you run into this error:
```
Could not find directory of OpenSSL installation, and this `-sys` crate cannot
  proceed without this knowledge. If OpenSSL is installed and this crate had
  trouble finding it,  you can set the `OPENSSL_DIR` environment variable for the
  compilation process.
```
Make sure you have the development packages of OpenSSL installed (`libssl-dev` on Ubuntu or `openssl-devel` on Fedora).


## Deployed Notary Servers

Note: we do not provide any guarantees on the stability of the notary server in its current state 
This is an experimental project.

https://notary.freysa.ai:7047

## Deployed Websocket servers 

wss://websockify.freysa.ai:55688

## Providers

A provider configuration is a JSON object describing a web request,  what and how to extract data from the response.
See [config.yaml](./crates/notary/server/config/config.yaml) to find the link to default provider list and provider schema.
