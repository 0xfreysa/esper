# Quick Start Guide

There is a simple react/typescript demo app in `./demo/react-ts-webpack`. The directory contains a webpack configuration file that allows you to quickly bootstrap a webpack app using tlsn-js. 

## Run a local notary server and websocket proxy

### Websocket Proxy <a name="proxy"></a>

Since a web browser doesn't have the ability to make TCP connection, we need to use a websocket proxy server.

To run your own websocket proxy for `https://swapi.dev` **locally**:

1. Install [websocat](https://github.com/vi/websocat):

    | tool   | command                       |
    |--------|-------------------------------|
    | cargo  | `cargo install websocat`      |
    | brew   | `brew install websocat`       |
    | source | https://github.com/vi/websocat|

2. Run a websocket proxy for `https://swapi.dev`:
```sh
websocat --binary -v ws-l:0.0.0.0:55688 tcp:swapi.dev:443
```

Note the `tcp:swapi.dev:443` argument on the last line, this is the server we will use in this quick start.

### Run a Local Notary Server <a name="local-notary"></a>

For this demo, we also need to run a local notary server.

1. Clone the TLSNotary repository:
   ```shell
   git clone https://github.com/tlsnotary/tlsn.git --branch "v0.1.0-alpha.5"
   ```
2. Edit the notary server config file (`notary-server/config/config.yaml`) to turn off TLS so that the browser extension can connect to the local notary server without requiring extra steps to accept self-signed certificates in the browser.
   ```yaml
   tls:
      enabled: false
   ```
3. Run the notary server:
   ```shell
   cd notary-server
   cargo run --release
   ```

The notary server will now be running in the background waiting for connections.

## `tlsn-js` in a React/Typescript app

### Run the
1. Clone the repository
    ```sh
    git clone https://github.com/tlsnotary/tlsn-js
    ```
2. Go to the demo folder
    ```sh
    cd ./tlsn-js/demo/react-ts-webpack
    ```
3. Install dependencies
    ```sh
    npm i
    ```
4. Start Webpack Dev Server:
    ```
    npm run dev
    ```
5. Open `http://localhost:8080` in your browser
6. Click the **start demo** button
7. Open developer tools and monitor the console logs
