import generateKeyPair from "./generateKeyPair";

// ECDSA = sign
// ECDH = encryption
export default async function generateKeysComb(
  type: "ECDSA" | "ECDH" = "ECDSA"
): Promise<globalThis.CryptoKeyPair> {
  return new Promise((resolve) => {
    return generateKeyPair(type, true).then((signKeys) => {
      resolve(signKeys);
    });
  });
}
