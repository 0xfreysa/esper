
[mit-badge]: https://img.shields.io/badge/license-MIT-blue.svg
[apache-badge]: https://img.shields.io/github/license/saltstack/salt

<img src="src/assets/img/icon-128.png" width="64"/>

# Extension module

> [!IMPORTANT]
> ⚠️ When running the extension against a notary server, please ensure that the server's version is the same as the version of this extension

## Get latest extension build

Go to repository page, then visit github actions and pick the latest successful run of workflow 'Github action build extension'.
You'll find the extension .zip at the bottom of the page.

## Fork changes

This extension has been forked from the original TLSNotary Chrome Extension and modified to work with the Freysa Notary Server running an enclave.

## Installing and Running

1. Check if your [Node.js](https://nodejs.org/) version is >= **18**.
2. Clone this repository.
3. Run `pnpm install` to install the dependencies.
4. Run `pnpm run dev`
5. Load your extension on Chrome following:
   1. Access `chrome://extensions/`
   2. Check `Developer mode`
   3. Click on `Load unpacked extension`
   4. Select the `build` folder.

## Building Websockify Docker Image
```
$ git clone https://github.com/novnc/websockify && cd websockify
$ ./docker/build.sh
$ docker run -it --rm -p 55688:80 novnc/websockify 80 api.x.com:443
```

## Packing

After the development of your extension run the command

```
$ NODE_ENV=production pnpm run build
```

Now, the content of `build` folder will be the extension ready to be submitted to the Chrome Web Store. Just take a look at the [official guide](https://developer.chrome.com/webstore/publish) to more infos about publishing.

## Update default providers & PCRS values

Update the default-config.json file, a default file is hosted [here](https://link.freysa.ai/default-config)
The link to files is located in constants.ts file.