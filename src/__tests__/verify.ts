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
  a: "0404f4f51849cbcea54eafbf9e4bbdacf0d6659faa50df529248c0360230daa754f7a43928da18cfe389687ee169825a68fa682d29d6337d1b1f619336bdf80f64",
  h: "423a5bfac6d5af6c83930e18c53df722b661bb78ea5e4ac9e02057ed65f35104",
  k: "test",
  n: 0,
  s: "62fe76e5c4c959f7a910070ebb003aea0af4edb15577e174ade9e225d4a432f9d38b76442e54f5d25fb33d075f863f92af4e5b78fbec6b63acb67fbe07992781",
  t: 1643989186242,
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

  expect(pubKey).toBe(publicHexed);
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

        expect(pubKeyRecovered).toBe(publicHexed.toLowerCase());
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
  a: "0404f4f51849cbcea54eafbf9e4bbdacf0d6659faa50df529248c0360230daa754f7a43928da18cfe389687ee169825a68fa682d29d6337d1b1f619336bdf80f64",
  h: "0000f0f6299c8b5540c30570541c3d7aea381ab394771d6f6ce5902ba18856b7",
  k: "test",
  n: 373,
  s: "66c363049bec2cd78c6e2aed3b00380a9546e171e5006d2e78b1567f91781e331089aebec0963bbc2f1d0204184490f2d5a852be432fc361f9fadac162f34629",
  t: 1643989211311,
  v: "value",
};

it("Can catch tampered messages (signature)", () => {
  return ClientA.verifyMessage(putSig, 3).then((result) => {
    expect(result).toEqual(VerifyResult.InvalidSignature);
  });
});

const tamperedNonce: VerificationData<string> = {
  a: "0404f4f51849cbcea54eafbf9e4bbdacf0d6659faa50df529248c0360230daa754f7a43928da18cfe389687ee169825a68fa682d29d6337d1b1f619336bdf80f64",
  h: "0000f0f6299c8b5540c30570541c3d7aea381ab394771d6f6ce5902ba18856b7",
  k: "test",
  n: 0,
  s: "77c363049bec2cd78c6e2aed3b00380a9546e171e5006d2e78b1567f91781e331089aebec0963bbc2f1d0204184490f2d5a852be432fc361f9fadac162f34629",
  t: 1643989211311,
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
  a: "0404f4f51849cbcea54eafbf9e4bbdacf0d6659faa50df529248c0360230daa754f7a43928da18cfe389687ee169825a68fa682d29d6337d1b1f619336bdf80f64",
  h: "0000f0f6299c8b5540c30570541c3d7aea381ab394771d6f6ce5902ba18856b7",
  k: "test",
  n: 373,
  s: "77c363049bec2cd78c6e2aed3b00380a9546e171e5006d2e78b1567f91781e331089aebec0963bbc2f1d0204184490f2d5a852be432fc361f9fadac162f34629",
  t: 1999989211311,
  v: "value",
};

it("Can catch tampered messages (time)", () => {
  return ClientA.verifyMessage(putTime).then((result) => {
    expect(result).toEqual(VerifyResult.InvalidTimestamp);
  });
});

const putPow: VerificationData<string> = {
  a: "0404f4f51849cbcea54eafbf9e4bbdacf0d6659faa50df529248c0360230daa754f7a43928da18cfe389687ee169825a68fa682d29d6337d1b1f619336bdf80f64",
  h: "2fe0f0f6299c8b5540c30570541c3d7aea381ab394771d6f6ce5902ba18856b7",
  k: "test",
  n: 373,
  s: "77c363049bec2cd78c6e2aed3b00380a9546e171e5006d2e78b1567f91781e331089aebec0963bbc2f1d0204184490f2d5a852be432fc361f9fadac162f34629",
  t: 1643989211311,
  v: "value",
};

// it("Can catch tampered messages (pow)", () => {
//   return ClientA.verifyMessage(putPow).then((result) => {
//     expect(result).toEqual(VerifyResult.NoProofOfWork);
//   });
// });

const privatePut: VerificationData<string> = {
  a: "0404f4f51849cbcea54eafbf9e4bbdacf0d6659faa50df529248c0360230daa754f7a43928da18cfe389687ee169825a68fa682d29d6337d1b1f619336bdf80f64",
  h: "00056bc08cd8765ee792f6c67c6c04d52be1583d75508910da00169c0f3c063a",
  k: ":0404f4f51849cbcea54eafbf9e4bbdacf0d6659faa50df529248c0360230daa754f7a43928da18cfe389687ee169825a68fa682d29d6337d1b1f619336bdf80f64.test",
  n: 733,
  s: "70ecc005fe2d57df8c9fbb61ed6203faa9933de15eebdd3d52b5dee5f4a424bdeb4714f0cb63047432d7d71d142469c0e5f3c4b08384d82c6f5bc9cac824344a",
  t: 1643989274250,
  v: "value",
};

it("Can verify namespaced PUT", () => {
  return ClientA.verifyMessage(privatePut).then((result) => {
    expect(result).toEqual(VerifyResult.Verified);
  });
});

const privatePutPubkey: VerificationData<string> = {
  a: "0404f4f51849cbcea54eafbf9e4bbdacf0d6659faa50df529248c0360230daa754f7a43928da18cfe389687ee169825a68fa682d29d6337d1b1f619336bdf80f64",
  h: "00056bc08cd8765ee792f6c67c6c04d52be1583d75508910da00169c0f3c063a",
  k: ":04ff0be846286d06f6b9297457261a1c51ad4db7d07af83792bdeb50db281a0d2b5d06f83059cf2c8bf75c7cae248d586d83319f4c04bf32880acc583996423b0f.test",
  n: 733,
  s: "70ecc005fe2d57df8c9fbb61ed6203faa9933de15eebdd3d52b5dee5f4a424bdeb4714f0cb63047432d7d71d142469c0e5f3c4b08384d82c6f5bc9cac824344a",
  t: 1643989274250,
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
    adress: hexPubkey,
    sig: signature,
  };

  const verified = await verifyPeer(peerData).catch(console.error);

  expect(verified).toBeTruthy();
});
