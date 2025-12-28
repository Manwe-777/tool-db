import { stringToArrayBuffer } from "tool-db";

import getCrypto from "./getCrypto";

export default function generateKeyFromPassword(password: string) {
  const crypto = getCrypto();
  const passwordBytes = new Uint8Array(stringToArrayBuffer(password));
  const saltBytes = new Uint8Array(stringToArrayBuffer("t6sa@8d7!2ñs?=adjq2ng"));
  return crypto.subtle
    .importKey(
      "raw",
      passwordBytes,
      { name: "PBKDF2" },
      false,
      ["deriveKey"]
    )
    .then((importedPassword) => {
      return crypto.subtle.deriveKey(
        {
          name: "PBKDF2",
          salt: saltBytes,
          iterations: 100000,
          hash: "SHA-256",
        },
        importedPassword,
        {
          name: "AES-GCM",
          length: 128,
        },
        false,
        ["encrypt", "decrypt"]
      );
    });
}
