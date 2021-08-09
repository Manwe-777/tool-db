import arrayBufferToString from "../arrayBufferToString";
import catchReturn from "../catchReturn";
import generateKeyFromPassword from "./generateKeyFromPassword";
import stringToArrayBuffer from "../stringToArrayBuffer";

export default function decryptWithPass(
  data: string,
  password: string,
  vector: Uint8Array
): Promise<string | undefined> {
  return generateKeyFromPassword(password)
    .then((keyObject) => {
      return window.crypto.subtle
        .decrypt(
          { name: "AES-GCM", iv: vector },
          keyObject,
          stringToArrayBuffer(data)
        )
        .then((result) => arrayBufferToString(result))
        .catch(catchReturn);
    })
    .catch(catchReturn);
}
