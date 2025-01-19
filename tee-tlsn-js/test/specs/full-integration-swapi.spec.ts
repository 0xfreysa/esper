import {
  Prover as _Prover,
  NotaryServer,
  NotarizedSession as _NotarizedSession,
  TlsProof as _TlsProof,
} from '../../src/lib';
import { assert } from '../utils';
import * as Comlink from 'comlink';

const { init, Prover, NotarizedSession, TlsProof }: any = Comlink.wrap(
  // @ts-ignore
  new Worker(new URL('../worker.ts', import.meta.url)),
);

(async function () {
  try {
    await init({ loggingLevel: 'Debug' });
    // @ts-ignore
    console.log('test start');
    console.time('prove');
    const prover = (await new Prover({
      id: 'test',
      serverDns: 'swapi.dev',
    })) as _Prover;
    const notary = NotaryServer.from('http://localhost:7047');
    await prover.setup(await notary.sessionUrl());
    await prover.sendRequest('wss://notary.pse.dev/proxy?token=swapi.dev', {
      url: 'https://swapi.dev/api/people/1',
      headers: {
        'content-type': 'application/json',
        secret: 'test_secret',
      },
    });
    const transcript = await prover.transcript();
    console.log({ transcript });
    const commit = {
      sent: [
        ...Object.entries(transcript.ranges.sent.headers)
          .filter(([k]) => k !== 'secret')
          .map(([, v]) => v),
        transcript.ranges.sent.info,
        ...transcript.ranges.sent.lineBreaks,
      ],
      recv: [
        ...Object.entries(transcript.ranges.recv.headers).map(([, v]) => v),
        transcript.ranges.recv.info,
        ...transcript.ranges.recv.lineBreaks,
        transcript.ranges.recv.json!['name'],
        transcript.ranges.recv.json!['hair_color'],
        transcript.ranges.recv.json!['skin_color'],
      ],
    };
    console.log(commit);
    const sessionHex = await prover.notarize(commit);
    const session = (await new NotarizedSession(
      sessionHex,
    )) as _NotarizedSession;
    const proofHex = await session.proof(commit);
    console.log('proof:', proofHex);
    const proof = (await new TlsProof(proofHex)) as _TlsProof;
    console.timeEnd('prove');

    console.log('Proof: ', JSON.stringify(proof));

    console.time('verify');
    const result = await proof.verify({
      typ: 'P256',
      key: await notary.publicKey(),
    });
    console.timeEnd('verify');

    console.log(result);
    assert(result.sent.includes('host: swapi.dev'));
    assert(!result.sent.includes('secret: test_secret'));
    assert(result.recv.includes('"name":"Luke Skywalker"'));
    assert(result.recv.includes('"hair_color":"blond"'));
    assert(result.recv.includes('"skin_color":"fair"'));

    // @ts-ignore
    document.getElementById('full-integration-swapi').textContent = 'OK';
  } catch (err) {
    console.log('caught error from wasm');
    console.error(err);

    // @ts-ignore
    document.getElementById('full-integration-swapi').textContent = err.message;
  }
})();
