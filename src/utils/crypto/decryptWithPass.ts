import arrayBufferToString from "../arrayBufferToString";
import catchReturn from "../catchReturn";
import generateKeyFromPassword from "./generateKeyFromPassword";

import getCrypto from "../../getCrypto";

export default function decryptWithPass(
  data: ArrayBuffer,
  password: string,
  vector: Uint8Array
): Promise<string | undefined> {
  const crypto = getCrypto();
  return generateKeyFromPassword(password)
    .then((keyObject) => {
      return crypto.subtle
        .decrypt({ name: "AES-GCM", iv: vector }, keyObject, data)
        .then((result) => arrayBufferToString(result))
        .catch(catchReturn);
    })
    .catch(catchReturn);
}
