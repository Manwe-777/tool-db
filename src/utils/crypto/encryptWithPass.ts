import arrayBufferToString from "../arrayBufferToString";
import catchReturn from "../catchReturn";
import generateKeyFromPassword from "./generateKeyFromPassword";
import stringToArrayBuffer from "../stringToArrayBuffer";
import getCrypto from "../../getCrypto";

export default function encryptWithPass(
  secretmessage: string,
  password: string,
  vector: Uint8Array
): Promise<string | undefined> {
  const crypto = getCrypto();
  return generateKeyFromPassword(password)
    .then((keyObject) => {
      // encrypt promise
      return crypto.subtle
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
