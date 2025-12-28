import {
  stringToArrayBuffer,
  arrayBufferToHex,
  catchReturn,
} from "tool-db";

import generateKeyFromPassword from "./generateKeyFromPassword";
import getCrypto from "./getCrypto";

export default function encryptWithPass(
  secretmessage: string,
  password: string,
  vector: Uint8Array
): Promise<string | undefined> {
  const crypto = getCrypto();
  const messageBytes = new Uint8Array(stringToArrayBuffer(secretmessage));
  return generateKeyFromPassword(password)
    .then((keyObject) => {
      // encrypt promise
      return crypto.subtle
        .encrypt(
          { name: "AES-GCM", iv: vector as BufferSource },
          keyObject,
          messageBytes
        )
        .then((data) => arrayBufferToHex(data))
        .catch(catchReturn);
    })
    .catch(catchReturn);
}
