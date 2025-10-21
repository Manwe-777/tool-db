import arrayBufferToString from "../utils/arrayBufferToString";
import hexToArrayBuffer from "../utils/hexToArrayBuffer";

import generateKeyFromPassword from "./generateKeyFromPassword";
import getCrypto from "./getCrypto";

export default async function decryptWithPass(
  data: string,
  password: string,
  vector: Uint8Array
): Promise<string | undefined> {
  try {
    const crypto = getCrypto();
    const keyObject = await generateKeyFromPassword(password);
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(vector) },
      keyObject,
      new Uint8Array(hexToArrayBuffer(data))
    );
    return arrayBufferToString(decrypted);
  } catch (error) {
    console.error("decryptWithPass error:", error);
    return undefined;
  }
}
