import generateKeyFromPassword from "./generateKeyFromPassword";
import stringToArrayBuffer from "../utils/stringToArrayBuffer";
import arrayBufferToHex from "../utils/arrayBufferToHex";

import getCrypto from "./getCrypto";

export default async function encryptWithPass(
  secretmessage: string,
  password: string,
  vector: Uint8Array
): Promise<string | undefined> {
  try {
    const crypto = getCrypto();
    const keyObject = await generateKeyFromPassword(password);
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: new Uint8Array(vector) },
      keyObject,
      new Uint8Array(stringToArrayBuffer(secretmessage))
    );
    return arrayBufferToHex(encrypted);
  } catch (error) {
    console.error("encryptWithPass error:", error);
    return undefined;
  }
}
