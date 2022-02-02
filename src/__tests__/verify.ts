import { VerificationData, VerifyResult } from "../types/message";

import catchReturn from "../utils/catchReturn";
import verifyPeer from "../utils/verifyPeer";
import getPeerSignature from "../utils/getPeerSignature";
import arrayBufferToHex from "../utils/arrayBufferToHex";

import base64KeyToHex from "../utils/crypto/base64KeyToHex";
import recoverPubKey from "../utils/crypto/recoverPubKey";

import {
  base64ToArrayBuffer,
  encodeKeyString,
  exportKey,
  generateKeyPair,
  sha256,
  signData,
  ToolDb,
} from "..";

import { Peer } from "../types/tooldb";
import leveldb from "../utils/leveldb";
import getCrypto from "../getCrypto";

jest.mock("../getCrypto.ts");
jest.setTimeout(10000);

let ClientA: ToolDb | undefined;

beforeAll((done) => {
  ClientA = new ToolDb({
    server: true,
    host: "127.0.0.1",
    port: 8888,
    storageAdapter: leveldb,
    storageName: "test-verify-a",
  });
  done();
});

afterAll((done) => {
  ClientA.network.server.close();
  setTimeout(done, 1000);
});

const putOk: VerificationData<string> = {
  k: "value",
  p: "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEA83bEyvgibCqXdF8dbgJmnal2gudXmC9AAMbDXzVzz5gJ5Fmr1hLpgqAo1gfuuyarIhX0GF1JoaueYmg5p7CBQ==",
  n: 679,
  t: 1628918110150,
  h: "0006fab5af92343498c132f3d01bde06ce401c624f503148ecd1ecdf01adca91",
  s: "Z1fCtW5rw6fCrW41GDDCuTVYw4zDl0XDu8K5I0ENDyDDo08Ywp/DkcO4wrLCv0oGwrzDjsORYzMbwoLDrn5CEcObSsKICAjCssOvMkbDoTjDrmMCJ8KvwpJRwpk=",
  v: "AzB4NzijkW",
};

const recoverTest: VerificationData<string> = {
  k: "test",
  p: "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE/wvoRihtBva5KXRXJhocUa1Nt9B6+DeSvetQ2ygaDStdBvgwWc8si/dcfK4kjVhtgzGfTAS/MogKzFg5lkI7Dw==",
  n: 0,
  t: 1643731511429,
  h: "38780383388f8fca79ac216f48ac529dacea3058498c55ecd52ef625af74b2ae",
  s: "CwVbOMK3Zi/Dv8KVw6rDuMOQbyw8GcKnbhx8wpnDo8Oqw48tw5TDgQzCh3jDgDbDqsKLTQJdw79Xw7Rjwo8yPhM5I8O8UMK8wrjDt8Kjw7gCwrQiwqobeMO+wqTDoUU=",
  v: "value",
};

it("Can verify PUT", () => {
  return ClientA.verifyMessage(recoverTest).then((result) => {
    expect(result).toEqual(VerifyResult.Verified);
  });
});

it("Can recover public key from message", async () => {
  // Convert the public key to hex
  const publicHexed = await base64KeyToHex(recoverTest.p);
  //
  const signature = base64ToArrayBuffer(recoverTest.s);
  const message = recoverTest.h;

  // Message needs to be hashed because webcrypto does it internally
  const pubKeyRecovered = recoverPubKey(sha256(message), signature);

  const matches = pubKeyRecovered.filter((k) => k === publicHexed);
  expect(matches[0]).toBe(publicHexed);
});

it("Can recover public key from signed data", (done) => {
  const crypto = getCrypto();

  generateKeyPair("ECDSA", true).then((keys) => {
    const message = "test";
    crypto.subtle.exportKey("raw", keys.publicKey).then((pk) => {
      const publicHexed = arrayBufferToHex(pk);
      signData(message, keys.privateKey).then((s) => {
        const signature = s;
        const pubKeyRecovered = recoverPubKey(sha256(message), signature);

        const matches = pubKeyRecovered.filter((k) => k === publicHexed);
        expect(matches[0]).toBe(publicHexed);
        done();
      });
    });
  });
});

it("Can catch invalid POW", () => {
  return ClientA.verifyMessage(putOk, 5).then((result) => {
    expect(result).toEqual(VerifyResult.NoProofOfWork);
  });
});

const putSig: VerificationData<string> = {
  k: "value",
  p: "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEA83bEyvgibCqXdF8dbgJmnal2gudXmC9AAMbDXzVzz5gJ5Fmr1hLpgqAo1gfuuyarIhX0GF1JoaueYmg5p7CBQ==",
  n: 679,
  t: 1628918110150,
  h: "0006fab5af92343498c132f3d01bde06ce401c624f503148ecd1ecdf01adca91",
  s: "Z2fCtW5rw6fCrW41GDDCuTVYw4zDl0XDu8K5I0ENDyDDo08Ywp/DkcO4wrLCv0oGwrzDjsORYzMbwoLDrn5CEcObSsKICAjCssOvMkbDoTjDrmMCJ8KvwpJRwpk=",
  v: "AzB4NzijkW",
};

it("Can catch tampered messages (signature)", () => {
  return ClientA.verifyMessage(putSig, 3).then((result) => {
    expect(result).toEqual(VerifyResult.InvalidSignature);
  });
});

const tamperedMsg: VerificationData<string> = {
  k: "value",
  p: "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEA83bEyvgibCqXdF8dbgJmnal2gudXmC9AAMbDXzVzz5gJ5Fmr1hLpgqAo1gfuuyarIhX0GF1JoaueYmg5p7CBQ==",
  n: 679,
  t: 1628918110150,
  h: "0006fab5af92343498c132f3d01bde06ce401c624f503148ecd1ecdf01adca92",
  s: "Z1fCtW5rw6fCrW41GDDCuTVYw4zDl0XDu8K5I0ENDyDDo08Ywp/DkcO4wrLCv0oGwrzDjsORYzMbwoLDrn5CEcObSsKICAjCssOvMkbDoTjDrmMCJ8KvwpJRwpk=",
  v: "AzB4NzijkW",
};

it("Can catch tampered POW", () => {
  return ClientA.verifyMessage(tamperedMsg, 3).then((result) => {
    expect(result).toEqual(VerifyResult.InvalidHashNonce);
  });
});

it("Can catch messages with missing data", () => {
  const delA: any = delete { ...putOk }.h;
  const pa = ClientA.verifyMessage(delA).then((result) => {
    expect(result).toEqual(VerifyResult.InvalidData);
  });

  const delB: any = delete { ...putOk }.k;
  const pb = ClientA.verifyMessage(delB).then((result) => {
    expect(result).toEqual(VerifyResult.InvalidData);
  });

  const delC: any = delete { ...putOk }.n;
  const pc = ClientA.verifyMessage(delC).then((result) => {
    expect(result).toEqual(VerifyResult.InvalidData);
  });

  const delD: any = delete { ...putOk }.p;
  const pd = ClientA.verifyMessage(delD).then((result) => {
    expect(result).toEqual(VerifyResult.InvalidData);
  });

  const delE: any = delete { ...putOk }.s;
  const pe = ClientA.verifyMessage(delE).then((result) => {
    expect(result).toEqual(VerifyResult.InvalidData);
  });

  const delF: any = delete { ...putOk }.t;
  const pf = ClientA.verifyMessage(delF).then((result) => {
    expect(result).toEqual(VerifyResult.InvalidData);
  });

  const delG: any = delete { ...putOk }.v;
  const pg = ClientA.verifyMessage(delG).then((result) => {
    expect(result).toEqual(VerifyResult.InvalidData);
  });

  return Promise.all([pa, pb, pc, pd, pe, pf, pg]);
});

it("Can print errors", async () => {
  const rejectPromise = new Promise((resolve, reject) => {
    reject();
  }).catch(catchReturn);

  expect(await rejectPromise).toBe(undefined);
});

const putTime: VerificationData<string> = {
  k: "value",
  p: "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEA83bEyvgibCqXdF8dbgJmnal2gudXmC9AAMbDXzVzz5gJ5Fmr1hLpgqAo1gfuuyarIhX0GF1JoaueYmg5p7CBQ==",
  n: 679,
  t: 2628918110150,
  h: "0006fab5af92343498c132f3d01bde06ce401c624f503148ecd1ecdf01adca91",
  s: "Z1fCtW5rw6fCrW41GDDCuTVYw4zDl0XDu8K5I0ENDyDDo08Ywp/DkcO4wrLCv0oGwrzDjsORYzMbwoLDrn5CEcObSsKICAjCssOvMkbDoTjDrmMCJ8KvwpJRwpk=",
  v: "AzB4NzijkW",
};

it("Can catch tampered messages (time)", () => {
  return ClientA.verifyMessage(putTime).then((result) => {
    expect(result).toEqual(VerifyResult.InvalidTimestamp);
  });
});

const putPow: VerificationData<string> = {
  k: "value",
  p: "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEA83bEyvgibCqXdF8dbgJmnal2gudXmC9AAMbDXzVzz5gJ5Fmr1hLpgqAo1gfuuyarIhX0GF1JoaueYmg5p7CBQ==",
  n: 679,
  t: 1628918110150,
  h: "00a6fab5af92343498c132f3d01bde06ce401c624f503148ecd1ecdf01adca91",
  s: "Z1fCtW5rw6fCrW41GDDCuTVYw4zDl0XDu8K5I0ENDyDDo08Ywp/DkcO4wrLCv0oGwrzDjsORYzMbwoLDrn5CEcObSsKICAjCssOvMkbDoTjDrmMCJ8KvwpJRwpk=",
  v: "AzB4NzijkW",
};

// it("Can catch tampered messages (pow)", () => {
//   return ClientA.verifyMessage(putPow).then((result) => {
//     expect(result).toEqual(VerifyResult.NoProofOfWork);
//   });
// });

const putNonce: VerificationData<string> = {
  k: "value",
  p: "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEA83bEyvgibCqXdF8dbgJmnal2gudXmC9AAMbDXzVzz5gJ5Fmr1hLpgqAo1gfuuyarIhX0GF1JoaueYmg5p7CBQ==",
  n: 111,
  t: 1628918110150,
  h: "0006fab5af92343498c132f3d01bde06ce401c624f503148ecd1ecdf01adca91",
  s: "Z1fCtW5rw6fCrW41GDDCuTVYw4zDl0XDu8K5I0ENDyDDo08Ywp/DkcO4wrLCv0oGwrzDjsORYzMbwoLDrn5CEcObSsKICAjCssOvMkbDoTjDrmMCJ8KvwpJRwpk=",
  v: "AzB4NzijkW",
};

// it("Can catch tampered messages (nonce)", () => {
//   return ClientA.verifyMessage(putNonce).then((result) => {
//     expect(result).toEqual(VerifyResult.InvalidHashNonce);
//   });
// });

const putValue: VerificationData<string> = {
  k: "value",
  p: "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEA83bEyvgibCqXdF8dbgJmnal2gudXmC9AAMbDXzVzz5gJ5Fmr1hLpgqAo1gfuuyarIhX0GF1JoaueYmg5p7CBQ==",
  n: 679,
  t: 1628918110150,
  h: "0006fab5af92343498c132f3d01bde06ce401c624f503148ecd1ecdf01adca91",
  s: "Z1fCtW5rw6fCrW41GDDCuTVYw4zDl0XDu8K5I0ENDyDDo08Ywp/DkcO4wrLCv0oGwrzDjsORYzMbwoLDrn5CEcObSsKICAjCssOvMkbDoTjDrmMCJ8KvwpJRwpk=",
  v: "hackerman",
};

// it("Can catch tampered messages (value)", () => {
//   return ClientA.verifyMessage(putValue).then((result) => {
//     expect(result).toEqual(VerifyResult.InvalidHashNonce);
//   });
// });

const privatePut: VerificationData<{ test: string }> = {
  k: ":MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEyc/RndWhhh6D1yBXkTtS9dT0sTwB/xwdRUra0AsEKCy0nfx52kOw2UkXWjen61R9YLHgJOATEYk+1OTuTPd8Fw==.value",
  p: "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEyc/RndWhhh6D1yBXkTtS9dT0sTwB/xwdRUra0AsEKCy0nfx52kOw2UkXWjen61R9YLHgJOATEYk+1OTuTPd8Fw==",
  n: 1268,
  t: 1628919444909,
  h: "0008bb47223e110194cb23d172ac714bf8323c1b5676f8db87611050832a018c",
  s: "GcOBWcOLewbDu3HCvMKQAiAWw7XCi3LCrMOVw53Dk3zDn8K/WsKzO8K8MC82S8O9w6MFOcKKwrrCk8K+w7MBVULCh8Oew7nDryoTNhtGwqpHacOvXMOywpXDr3AkEnU=",
  v: { test: "a1AMXh4hZhI2lc5ONBa5" },
};

it("Can verify namespaced PUT", () => {
  return ClientA.verifyMessage(privatePut).then((result) => {
    expect(result).toEqual(VerifyResult.Verified);
  });
});

const privatePutPubkey: VerificationData<{ test: string }> = {
  k: ":MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEyc/RndWhhh6D1yBXkTtS9dT0sTwB/xwdRUra0AsEKCy0nfx52kOw2UkXWjen61R9YLHgJOATEYk+1OTuTPd8Gw==.value",
  p: "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEyc/RndWhhh6D1yBXkTtS9dT0sTwB/xwdRUra0AsEKCy0nfx52kOw2UkXWjen61R9YLHgJOATEYk+1OTuTPd8Fw==",
  n: 1268,
  t: 1628919444909,
  h: "0008bb47223e110194cb23d172ac714bf8323c1b5676f8db87611050832a018c",
  s: "GcOBWcOLewbDu3HCvMKQAiAWw7XCi3LCrMOVw53Dk3zDn8K/WsKzO8K8MC82S8O9w6MFOcKKwrrCk8K+w7MBVULCh8Oew7nDryoTNhtGwqpHacOvXMOywpXDr3AkEnU=",
  v: { test: "a1AMXh4hZhI2lc5ONBa5" },
};

it("Can catch pubkey replacement", () => {
  return ClientA.verifyMessage(privatePutPubkey).then((result) => {
    expect(result).toEqual(VerifyResult.PubKeyMismatch);
  });
});

it("Can verify peers", async () => {
  const keys = await generateKeyPair("ECDSA", true);

  const pubkeyString = await exportKey("spki", keys.publicKey).then((skpub) =>
    encodeKeyString(skpub as ArrayBuffer)
  );

  const timestamp = new Date().getTime();

  const signature = await getPeerSignature(
    keys.privateKey,
    "topic",
    timestamp,
    "host",
    8080
  );

  expect(signature).toBeDefined();

  if (!signature) return;

  const peerData: Peer = {
    topic: "topic",
    timestamp: timestamp,
    host: "host",
    port: 8080,
    pubkey: pubkeyString,
    sig: signature,
  };

  const verified = await verifyPeer(peerData).catch(console.error);

  expect(verified).toBeTruthy();
});
