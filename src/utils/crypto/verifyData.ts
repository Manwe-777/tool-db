import stringToArrayBuffer from "../stringToArrayBuffer";

export default function verifyData(
  data: string,
  signature: string,
  publicKey: CryptoKey
) {
  return window.crypto.subtle.verify(
    {
      name: "ECDSA",
      hash: { name: "SHA-256" }, // can be "SHA-1", "SHA-256", "SHA-384", or "SHA-512"
    },
    publicKey, // from generateKey or importKey above
    stringToArrayBuffer(signature), // ArrayBuffer of the signature
    stringToArrayBuffer(data) // ArrayBuffer of the data
  );
}
