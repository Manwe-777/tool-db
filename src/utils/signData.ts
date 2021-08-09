import arrayBufferToString from "./arrayBufferToString";
import stringToArrayBuffer from "./stringToArrayBuffer";

export default function signData(data: string, privateKey: CryptoKey) {
  return window.crypto.subtle
    .sign(
      {
        name: "ECDSA",
        hash: { name: "SHA-256" }, // can be "SHA-1", "SHA-256", "SHA-384", or "SHA-512"
      },
      privateKey, // from generateKey or importKey above
      stringToArrayBuffer(data) // ArrayBuffer of data you want to sign
    )
    .then((signature) => {
      // returns an ArrayBuffer containing the signature
      return arrayBufferToString(signature);
    });
}
