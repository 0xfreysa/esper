![MIT licensed][mit-badge]
![Apache licensed][apache-badge]

[mit-badge]: https://img.shields.io/badge/license-MIT-blue.svg
[apache-badge]: https://img.shields.io/github/license/saltstack/salt

# JS Module 

NPM Modules for producing TLS data attestation.

The attestations are produced by a Notary Server.

> [!IMPORTANT]
> `This module is developed for usage **in the Browser**. It does not work in `Node.js`.

## Build WASM   

The WASM component is essential as it contains all the notary interaction logic.
It is built from the [tee-tlsn](./tee-tlsn/README.md) repository.

## Run verifier demo app

```bash
pnpm install
pnpm run build
cd demo/react-ts-webpack
pnpm i && pnpm run dev 
```
Note: If compilation doesn't work, check the file 'workerHelpers.worker.js' and replace the path to '../../../tlsn_wasm.js'
