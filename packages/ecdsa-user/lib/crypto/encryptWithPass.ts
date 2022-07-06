import generateKeyFromPassword from "./generateKeyFromPassword";
import stringToArrayBuffer from "../utils/stringToArrayBuffer";
import arrayBufferToHex from "../utils/arrayBufferToHex";
import catchReturn from "../utils/catchReturn";

import getCrypto from "./getCrypto";

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
        .then((data) => arrayBufferToHex(data))
        .catch(catchReturn);
    })
    .catch(catchReturn);
}
