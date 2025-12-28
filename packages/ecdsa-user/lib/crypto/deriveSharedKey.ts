import getCrypto from "./getCrypto";

/**
 * Derive a shared AES-GCM key from our private key and their public key using ECDH.
 * This implements Elliptic Curve Diffie-Hellman key agreement.
 *
 * @param ourPrivateKey - Our ECDH private key (CryptoKey)
 * @param theirPublicKey - Their ECDH public key (CryptoKey)
 * @returns A derived AES-GCM key for encryption/decryption
 */
export default async function deriveSharedKey(
  ourPrivateKey: CryptoKey,
  theirPublicKey: CryptoKey
): Promise<CryptoKey> {
  const crypto = getCrypto();

  return crypto.subtle.deriveKey(
    {
      name: "ECDH",
      public: theirPublicKey,
    },
    ourPrivateKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt", "decrypt"]
  );
}

