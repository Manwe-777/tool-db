import getCrypto from "../../getCrypto";
import stringToArrayBuffer from "../stringToArrayBuffer";

export default function generateKeyFromPassword(password: string) {
  const crypto = getCrypto();
  return crypto.subtle
    .importKey(
      "raw",
      stringToArrayBuffer(password),
      { name: "PBKDF2" },
      false,
      ["deriveKey"]
    )
    .then((importedPassword) => {
      return crypto.subtle.deriveKey(
        {
          name: "PBKDF2",
          salt: stringToArrayBuffer("t6sa@8d7!2ñs?=adjq2ng"),
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
