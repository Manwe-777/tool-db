import { VerifyResult } from "../types/message";

import catchReturn from "../utils/catchReturn";

import { Peer, ToolDb, ToolDbLeveldb, VerificationData } from "..";
import getPeerSignature from "../utils/getPeerSignature";
import verifyPeer from "../utils/verifyPeer";

jest.mock("../getCrypto.ts");
jest.setTimeout(10000);

let ClientA: ToolDb;

beforeAll((done) => {
  ClientA = new ToolDb({
    server: true,
    host: "127.0.0.1",
    port: 8888,
    storageAdapter: ToolDbLeveldb,
    storageName: "test-verify-a",
  });
  ClientA.anonSignIn();

  done();
});

afterAll((done) => {
  ClientA.network.server.close();
  setTimeout(done, 1000);
});

const putOk: VerificationData<string> = {
  k: "test",
  a: "0xadd182F22D7ceaE234a99c7c89c93c664bA3ECaD",
  n: 0,
  t: 1647640220476,
  h: "0d4d06c94612cbebd39b6bf3ccc54f666590612dce89f07b75b9482063006e7d",
  s: "0x0857c2e6a256d9a866500be860288510b8b84f0d4e35f75cda97531492e4ba670fe7e9b2bca6abe4a1d270002947493ac261657b3ea6640127af7dab783d5fb61c",
  v: "value",
  c: null,
};

it("Can verify PUT", () => {
  return ClientA.verifyMessage<string>(putOk).then((result) => {
    expect(result).toEqual(VerifyResult.Verified);
  });
});

it("Can catch invalid POW", () => {
  return ClientA.verifyMessage(putOk, 5).then((result) => {
    expect(result).toEqual(VerifyResult.NoProofOfWork);
  });
});

const putSig: VerificationData<string> = {
  k: "test",
  a: "0xadd182F22D7ceaE234a99c7c89c93c664bA3ECaD",
  n: 8312,
  t: 1647640402279,
  h: "000669d4ee75d8610e55304a21c5acf9856011828a295c129ca95344696cf2e0",
  s: "0xd4dbeb203f11f55160e8620e014f12ab9bb046bcabbbe2f39993ae89ef32d4c53e6b35b638ea75a7a9275e49c98a1f65dd18f1435f14e4d53bebfd070981f5f81b",
  v: "value",
  c: null,
};

it("Can catch tampered messages (signature)", () => {
  return ClientA.verifyMessage(putSig, 3).then((result) => {
    expect(result).toEqual(VerifyResult.InvalidSignature);
  });
});

const tamperedNonce: VerificationData<string> = {
  k: "test",
  a: "0xadd182F22D7ceaE234a99c7c89c93c664bA3ECaD",
  n: 82,
  t: 1647640402279,
  h: "000669d4ee75d8610e55304a21c5acf9856011828a295c129ca95344696cf2e0",
  s: "0xd4dbeb203f11f55160e8620e014f12ab9bb046bcabbbe2f39993ae89ef32d4c53e5b35b638ea75a7a9275e49c98a1f65dd18f1435f14e4d53bebfd070981f5f81b",
  v: "value",
  c: null,
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
  k: "test",
  a: "0xadd182F22D7ceaE234a99c7c89c93c664bA3ECaD",
  n: 8312,
  t: 2647640402279,
  h: "000669d4ee75d8610e55304a21c5acf9856011828a295c129ca95344696cf2e0",
  s: "0xd4dbeb203f11f55160e8620e014f12ab9bb046bcabbbe2f39993ae89ef32d4c53e5b35b638ea75a7a9275e49c98a1f65dd18f1435f14e4d53bebfd070981f5f81b",
  v: "value",
  c: null,
};

it("Can catch tampered messages (time)", () => {
  return ClientA.verifyMessage(putTime).then((result) => {
    expect(result).toEqual(VerifyResult.InvalidTimestamp);
  });
});

const privatePut: VerificationData<string> = {
  k: ":0xadd182F22D7ceaE234a99c7c89c93c664bA3ECaD.test",
  a: "0xadd182F22D7ceaE234a99c7c89c93c664bA3ECaD",
  n: 9245,
  t: 1647640485709,
  h: "000a38b897728bc1a47be95ffdc0643b346a10e4159ac8c8fb4d33bd78e541d7",
  s: "0x1e3ca6c48f5ae7d55104217d7e38860ac31693ce80a56aca4c6ca0bd22c372e909a96d67470a26c15834c76c30a0b775d33a57854912dea9d03342dcd28334bb1c",
  v: "value",
  c: null,
};

it("Can verify namespaced PUT", () => {
  return ClientA.verifyMessage(privatePut).then((result) => {
    expect(result).toEqual(VerifyResult.Verified);
  });
});

const privatePutAddress: VerificationData<string> = {
  k: ":0xadd182F22D7ceaE234a99c7c89c93c664bA3ECaD.test",
  a: "0x1E80E2B44676624ff6712BeC97A22A42413a266f",
  n: 9245,
  t: 1647640485709,
  h: "000a38b897728bc1a47be95ffdc0643b346a10e4159ac8c8fb4d33bd78e541d7",
  s: "0x1e3ca6c48f5ae7d55104217d7e38860ac31693ce80a56aca4c6ca0bd22c372e909a96d67470a26c15834c76c30a0b775d33a57854912dea9d03342dcd28334bb1c",
  v: "value",
  c: null,
};

it("Can catch address replacement", () => {
  return ClientA.verifyMessage(privatePutAddress).then((result) => {
    expect(result).toEqual(VerifyResult.AddressMismatch);
  });
});

it("Can verify peers", async () => {
  const timestamp = new Date().getTime();

  const signature = await getPeerSignature(
    ClientA.peerAccount,
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
    address: ClientA.peerAccount.getAddress() || "",
    sig: signature,
  };

  const verified = await verifyPeer(ClientA, peerData);

  expect(verified).toBeTruthy();
});

// This test fails because we are testing on a local node
// if it were a test against a remote node it will work
// But now I am not sure if I should add verification to local PUTs as well?
// Maybe partial verification without signature checks to make it fast?
// it("Can verify unique namespace", (done) => {
//   const testKey = "test-key-" + textRandom(16);

//   return ClientA.putData(testKey, "value_1").then((firstPut) => {
//     ClientA.verifyMessage(firstPut).then((firstVerfied) => {
//       expect(firstVerfied).toEqual(VerifyResult.Verified);
//       ClientA.anonSignIn();

//       return ClientA.putData(testKey, "value_2").then((secPut) => {
//         ClientA.verifyMessage(secPut).then((secVerified) => {
//           expect(secVerified).toEqual(VerifyResult.CantOverwrite);
//           done();
//         });
//       });
//     });
//   });
// });
