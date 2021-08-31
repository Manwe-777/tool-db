import generateKeyPair from "./generateKeyPair";

export default async function generateKeysComb(): Promise<{
  signKeys: CryptoKeyPair;
  encryptionKeys: CryptoKeyPair;
}> {
  return new Promise((resolve) => {
    return generateKeyPair("ECDSA", true).then((signKeys) => {
      return generateKeyPair("ECDH", true).then((encryptionKeys) => {
        resolve({
          signKeys,
          encryptionKeys,
        } as {
          signKeys: CryptoKeyPair;
          encryptionKeys: CryptoKeyPair;
        });
      });
    });
  });
}
