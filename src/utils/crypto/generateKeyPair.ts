import getCrypto from "../../getCrypto";

export default function generateKeyPair(
  mode: "ECDSA" | "ECDH",
  extractable = false
): Promise<CryptoKeyPair> {
  const crypto = getCrypto();
  return crypto.subtle.generateKey(
    {
      name: mode,
      namedCurve: "P-256", // can be "P-256", "P-384", or "P-521"
    },
    extractable, // whether the key is extractable (i.e. can be used in exportKey)
    mode === "ECDSA" ? ["sign", "verify"] : ["deriveKey", "deriveBits"]
  );
}
