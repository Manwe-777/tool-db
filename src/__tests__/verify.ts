import elliptic from "elliptic";
import { VerificationData, VerifyResult } from "../types/message";

import catchReturn from "../utils/catchReturn";
import verifyPeer from "../utils/verifyPeer";
import getPeerSignature from "../utils/getPeerSignature";

import recoverPubKey from "../utils/crypto/recoverPubKey";
import exportKeyAsHex from "../utils/crypto/exportKeyAsHex";

import {
  arrayBufferToHex,
  exportKey,
  generateKeyPair,
  hexToArrayBuffer,
  sha256,
  signData,
  ToolDb,
} from "..";

import { Peer } from "../types/tooldb";
import leveldb from "../utils/leveldb";

jest.mock("../getCrypto.ts");
jest.setTimeout(10000);

let ClientA: ToolDb | undefined;

beforeAll((done) => {
  (global as any).ecp256 = new elliptic.ec("p256");

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
  a: "248d586d83319f4c04bf32880acc583996423b0f",
  h: "591aa039f34a7b48c6d7631742a91afd095035853ac058f83744f8cc510dc915",
  k: "test",
  n: 0,
  s: "f9f16da80a8e280c8aa819f87f0bf7807da353eb5a7178d5dec4aa1c0abaa3fc380348da23297262fbf3ab726ff9929a15878bf5d4adf7d36c4aba9467104bdd",
  t: 1643897763483,
  v: "value",
};

it("Can verify PUT", () => {
  return ClientA.verifyMessage(putOk).then((result) => {
    expect(result).toEqual(VerifyResult.Verified);
  });
});

it("Can recover public key from message", async () => {
  // Convert the public key to hex
  const publicHexed = putOk.a;
  //
  const signature = hexToArrayBuffer(putOk.s);
  const message = putOk.h;

  // Message needs to be hashed because webcrypto does it internally
  const pubKey = recoverPubKey(sha256(message), signature, publicHexed);

  expect(pubKey.slice(-40)).toBe(publicHexed.slice(-40));
});

it("Can recover public key from signed data", (done) => {
  generateKeyPair("ECDSA", true).then((keys) => {
    const message = "test";
    exportKeyAsHex(keys.publicKey).then((publicHexed) => {
      signData(message, keys.privateKey).then((s) => {
        const signature = s;
        const pubKeyRecovered = recoverPubKey(
          sha256(message),
          signature,
          publicHexed
        );

        expect(pubKeyRecovered.slice(-40)).toBe(publicHexed.slice(-40));
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
  a: "248d586d83319f4c04bf32880acc583996423b0f",
  h: "0000e4f2a7f633519e1ed1d20e79523f88f51b2655d26805f95aecbab7e3d2a6",
  k: "test",
  n: 6643,
  s: "925cd517779b79da5136644fe3484bee61a4b3ce5b95044ccd8022b7148968e7212c34c11ef4ad3b06a95a0eeac256e0be83baa046e91f185cfcef18cb1c6760",
  t: 1643899535113,
  v: "value",
};

it("Can catch tampered messages (signature)", () => {
  return ClientA.verifyMessage(putSig, 3).then((result) => {
    expect(result).toEqual(VerifyResult.InvalidSignature);
  });
});

const tamperedNonce: VerificationData<string> = {
  a: "248d586d83319f4c04bf32880acc583996423b0f",
  h: "0000e4f2a7f633519e1ed1d20e79523f88f51b2655d26805f95aecbab7e3d2a6",
  k: "test",
  n: 0,
  s: "926cd517779b79da5136644fe3484bee61a4b3ce5b95044ccd8022b7148968e7212c34c11ef4ad3b06a95a0eeac256e0be83baa046e91f185cfcef18cb1c6769",
  t: 1643899535113,
  v: "value",
};

it("Can catch tampered POW", () => {
  return ClientA.verifyMessage(tamperedNonce, 3).then((result) => {
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

  const delD: any = delete { ...putOk }.a;
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
  a: "248d586d83319f4c04bf32880acc583996423b0f",
  h: "591aa039f34a7b48c6d7631742a91afd095035853ac058f83744f8cc510dc915",
  k: "test",
  n: 0,
  s: "f9f16da80a8e280c8aa819f87f0bf7807da353eb5a7178d5dec4aa1c0abaa3fc380348da23297262fbf3ab726ff9929a15878bf5d4adf7d36c4aba9467104bdd",
  t: 1943887760383,
  v: "value",
};

it("Can catch tampered messages (time)", () => {
  return ClientA.verifyMessage(putTime).then((result) => {
    expect(result).toEqual(VerifyResult.InvalidTimestamp);
  });
});

const putPow: VerificationData<string> = {
  a: "248d586d83319f4c04bf32880acc583996423b0f",
  h: "591aa039f34a7b48c6d7631742a91afd095035853ac058f83744f8cc510dc915",
  k: "test",
  n: 0,
  s: "f9f16da80a8e280c8aa819f87f0bf7807da353eb5a7178d5dec4aa1c0abaa3fc380348da23297262fbf3ab726ff9929a15878bf5d4adf7d36c4aba9467104bdd",
  t: 1643897763483,
  v: "value",
};

// it("Can catch tampered messages (pow)", () => {
//   return ClientA.verifyMessage(putPow).then((result) => {
//     expect(result).toEqual(VerifyResult.NoProofOfWork);
//   });
// });

const putNonce: VerificationData<string> = {
  a: "248d586d83319f4c04bf32880acc583996423b0f",
  h: "591aa039f34a7b48c6d7631742a91afd095035853ac058f83744f8cc510dc915",
  k: "test",
  n: 0,
  s: "f9f16da80a8e280c8aa819f87f0bf7807da353eb5a7178d5dec4aa1c0abaa3fc380348da23297262fbf3ab726ff9929a15878bf5d4adf7d36c4aba9467104bdd",
  t: 1643897763483,
  v: "value",
};

// it("Can catch tampered messages (nonce)", () => {
//   return ClientA.verifyMessage(putNonce).then((result) => {
//     expect(result).toEqual(VerifyResult.InvalidHashNonce);
//   });
// });

const putValue: VerificationData<string> = {
  a: "248d586d83319f4c04bf32880acc583996423b0f",
  h: "591aa039f34a7b48c6d7631742a91afd095035853ac058f83744f8cc510dc915",
  k: "test",
  n: 0,
  s: "f9f16da80a8e280c8aa819f87f0bf7807da353eb5a7178d5dec4aa1c0abaa3fc380348da23297262fbf3ab726ff9929a15878bf5d4adf7d36c4aba9467104bdd",
  t: 1643897763483,
  v: "value",
};

// it("Can catch tampered messages (value)", () => {
//   return ClientA.verifyMessage(putValue).then((result) => {
//     expect(result).toEqual(VerifyResult.InvalidHashNonce);
//   });
// });

const privatePut: VerificationData<string> = {
  a: "248d586d83319f4c04bf32880acc583996423b0f",
  h: "9533de18f7e4727879233f96ab5f58b90c95c4c9cd9f989d939f4ca2dfb75eec",
  k: ":248d586d83319f4c04bf32880acc583996423b0f.test",
  n: 0,
  s: "12c53594eeab23c5fd4a3610bd20f1063afe64ec5ba6a9cd927f5afb10675cf4042c36727d681b92ecc1e34f300e7c08e1d9837c0137fddde1f2b2dbc3d31173",
  t: 1643897897090,
  v: "value",
};

it("Can verify namespaced PUT", () => {
  return ClientA.verifyMessage(privatePut).then((result) => {
    expect(result).toEqual(VerifyResult.Verified);
  });
});

const privatePutPubkey: VerificationData<string> = {
  a: "248d586d83319f4c04bf32880acc583996423b0f",
  h: "9533de18f7e4727879233f96ab5f58b90c95c4c9cd9f989d939f4ca2dfb75eec",
  k: ":204bf32880acc583996423b0f48d586d83319f4c.test",
  n: 0,
  s: "12c53594eeab23c5fd4a3610bd20f1063afe64ec5ba6a9cd927f5afb10675cf4042c36727d681b92ecc1e34f300e7c08e1d9837c0137fddde1f2b2dbc3d31173",
  t: 1643897897090,
  v: "value",
};

it("Can catch pubkey replacement", () => {
  return ClientA.verifyMessage(privatePutPubkey).then((result) => {
    expect(result).toEqual(VerifyResult.PubKeyMismatch);
  });
});

it("Can verify peers", async () => {
  const keys = await generateKeyPair("ECDSA", true);

  const hexPubkey = await exportKey("raw", keys.publicKey).then((skpub) =>
    arrayBufferToHex(skpub as ArrayBuffer)
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
    adress: hexPubkey.slice(-40),
    sig: signature,
  };

  const verified = await verifyPeer(peerData).catch(console.error);

  expect(verified).toBeTruthy();
});
