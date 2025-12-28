import {
  arrayBufferToString,
  hexToArrayBuffer,
  catchReturn,
} from "tool-db";

import generateKeyFromPassword from "./generateKeyFromPassword";
import getCrypto from "./getCrypto";

export default function decryptWithPass(
  data: string,
  password: string,
  vector: Uint8Array
): Promise<string | undefined> {
  const crypto = getCrypto();
  const dataBytes = new Uint8Array(hexToArrayBuffer(data));
  return generateKeyFromPassword(password)
    .then((keyObject) => {
      return crypto.subtle
        .decrypt(
          { name: "AES-GCM", iv: vector as BufferSource },
          keyObject,
          dataBytes
        )
        .then((result) => arrayBufferToString(result))
        .catch(catchReturn);
    })
    .catch(catchReturn);
}
