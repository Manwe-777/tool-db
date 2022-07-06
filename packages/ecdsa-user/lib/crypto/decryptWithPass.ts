import arrayBufferToString from "../utils/arrayBufferToString";
import hexToArrayBuffer from "../utils/hexToArrayBuffer";
import catchReturn from "../utils/catchReturn";

import generateKeyFromPassword from "./generateKeyFromPassword";
import getCrypto from "./getCrypto";

export default function decryptWithPass(
  data: string,
  password: string,
  vector: Uint8Array
): Promise<string | undefined> {
  const crypto = getCrypto();
  return generateKeyFromPassword(password)
    .then((keyObject) => {
      return crypto.subtle
        .decrypt(
          { name: "AES-GCM", iv: vector },
          keyObject,
          hexToArrayBuffer(data)
        )
        .then((result) => arrayBufferToString(result))
        .catch(catchReturn);
    })
    .catch(catchReturn);
}
