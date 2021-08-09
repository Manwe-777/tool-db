import arrayBufferToString from "../arrayBufferToString";
import catchReturn from "../catchReturn";
import generateKeyFromPassword from "./generateKeyFromPassword";
import stringToArrayBuffer from "../stringToArrayBuffer";

export default function encryptWithPass(
  secretmessage: string,
  password: string,
  vector: Uint8Array
): Promise<string | undefined> {
  return generateKeyFromPassword(password)
    .then((keyObject) => {
      // encrypt promise
      return window.crypto.subtle
        .encrypt(
          { name: "AES-GCM", iv: vector },
          keyObject,
          stringToArrayBuffer(secretmessage)
        )
        .then((result) => {
          return arrayBufferToString(result);
        })
        .catch(catchReturn);
    })
    .catch(catchReturn);
}
