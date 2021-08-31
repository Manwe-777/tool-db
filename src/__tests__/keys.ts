import exportKey from "../utils/crypto/exportKey";
import generateKeyPair from "../utils/crypto/generateKeyPair";
import generateKeysComb from "../utils/crypto/generateKeysComb";

jest.mock("../getCrypto.ts");

it("Can generate key pair combination", () => {
  return expect(generateKeysComb()).resolves.toBeDefined();
});

it("Can generate Signing/secure keys", async () => {
  const keyPair = await generateKeyPair("ECDSA");

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
  const keyPair = await generateKeyPair("ECDH");

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
