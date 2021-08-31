import getCrypto from "../../getCrypto";
import arrayBufferToString from "../arrayBufferToString";
import base64ToUint8 from "../base64ToUint8";
import catchReturn from "../catchReturn";
import stringToArrayBuffer from "../stringToArrayBuffer";

export default function decryptData(
  data: string,
  privateKey: CryptoKey,
  iv: string
): Promise<string | undefined> {
  const crypto = getCrypto();
  return crypto.subtle
    .decrypt(
      {
        name: "AES-GCM",
        iv: base64ToUint8(iv),
        tagLength: 128, // The tagLength you used to encrypt (if any)
      },
      privateKey, // from generateKey or importKey above
      stringToArrayBuffer(data) // ArrayBuffer of the data
    )
    .then((decrypted) => {
      // returns an ArrayBuffer containing the decrypted data
      return arrayBufferToString(decrypted);
    })
    .catch(catchReturn);
}
