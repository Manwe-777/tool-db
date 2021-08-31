import getCrypto from "../../getCrypto";
import arrayBufferToString from "../arrayBufferToString";
import stringToArrayBuffer from "../stringToArrayBuffer";

export default function encryptData(
  data: string,
  publicKey: CryptoKey,
  iv: Uint8Array
): Promise<string | void> {
  const crypto = getCrypto();
  return crypto.subtle
    .encrypt(
      {
        name: "AES-GCM",
        // Don't re-use initialization vectors!
        // Always generate a new iv every time your encrypt!
        // Recommended to use 12 bytes length
        iv,
        // Tag length (optional)
        tagLength: 128, // can be 32, 64, 96, 104, 112, 120 or 128 (default)
      },
      publicKey, // from generateKey or importKey above
      stringToArrayBuffer(data) // ArrayBuffer of data you want to encrypt
    )
    .then((encrypted) => {
      // returns an ArrayBuffer containing the encrypted data
      return arrayBufferToString(encrypted);
    })
    .catch(console.error);
}
