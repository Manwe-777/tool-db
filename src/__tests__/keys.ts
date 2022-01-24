import { ToolDb } from "..";
import toolDbGetPubKey from "../toolDbGetPubKey";
import exportKey from "../utils/crypto/exportKey";
import generateKeyPair from "../utils/crypto/generateKeyPair";
import generateKeysComb from "../utils/crypto/generateKeysComb";
import leveldb from "../utils/leveldb";

jest.setTimeout(10000);

jest.mock("../getCrypto.ts");

let ClientA: ToolDb | undefined;
let ClientB: ToolDb | undefined;

beforeAll((done) => {
  ClientA = new ToolDb({
    server: true,
    host: "127.0.0.1",
    port: 9999,
    storageAdapter: leveldb,
    storageName: "test-keys-a",
  });

  ClientB = new ToolDb({
    server: true,
    host: "127.0.0.1",
    port: 9998,
    storageAdapter: leveldb,
    storageName: "test-keys-b",
  });
  ClientB.anonSignIn();
  done();
});

afterAll((done) => {
  ClientA.network.server.close();
  ClientB.network.server.close();
  setTimeout(done, 1000);
});

it("Can generate key pair combination", () => {
  return expect(generateKeysComb()).resolves.toBeDefined();
});

it("Can generate Signing/secure keys", async () => {
  const keyPair = await generateKeyPair("ECDSA", false);

  let privKey, pubKey;
  try {
    privKey = await exportKey("pkcs8", keyPair.privateKey as CryptoKey);
    pubKey = await exportKey("spki", keyPair.publicKey as CryptoKey);
  } catch (e) {
    // console.error(e);
  }

  expect(pubKey).toBeUndefined();
  expect(privKey).toBeUndefined();
});

it("Can generate Encryption/secure keys", async () => {
  const keyPair = await generateKeyPair("ECDH", false);

  let privKey, pubKey;
  try {
    privKey = await exportKey("pkcs8", keyPair.privateKey as CryptoKey);
    pubKey = await exportKey("spki", keyPair.publicKey as CryptoKey);
  } catch (e) {
    // console.error(e);
  }

  expect(pubKey).toBeUndefined();
  expect(privKey).toBeUndefined();
});

it("Can generate Signing/extractable keys", async () => {
  const keyPair = await generateKeyPair("ECDSA", true);

  let privKey, pubKey;
  try {
    privKey = await exportKey("pkcs8", keyPair.privateKey as CryptoKey);
    pubKey = await exportKey("spki", keyPair.publicKey as CryptoKey);
  } catch (e) {
    // console.error(e);
  }

  expect(pubKey).toBeDefined();
  expect(privKey).toBeDefined();
});

it("Can generate Encryption/extractable keys", async () => {
  const keyPair = await generateKeyPair("ECDH", true);

  let privKey, pubKey;
  try {
    privKey = await exportKey("pkcs8", keyPair.privateKey as CryptoKey);
    pubKey = await exportKey("spki", keyPair.publicKey as CryptoKey);
  } catch (e) {
    // console.error(e);
  }

  expect(pubKey).toBeDefined();
  expect(privKey).toBeDefined();
});

it("Cant get the public key keys if its not authorized", (done) => {
  setTimeout(() => {
    toolDbGetPubKey
      .call(ClientA)
      .then((e) => {
        expect(e).toBeUndefined();
      })
      .catch((e) => {
        expect(e.message).toBe("You are not authorized yet.");
        done();
      });
  }, 250);
});

it("Cant get the public key keys", (done) => {
  setTimeout(() => {
    toolDbGetPubKey.call(ClientB).then((key) => {
      expect(key).toBeDefined();
      done();
    });
  }, 250);
});
