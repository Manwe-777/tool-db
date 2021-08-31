import getCrypto from "../../getCrypto";

export default function deriveSecret(keys: CryptoKeyPair) {
  const crypto = getCrypto();
  return crypto.subtle.deriveKey(
    {
      name: "ECDH",
      public: keys.publicKey,
    },
    keys.privateKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
}
