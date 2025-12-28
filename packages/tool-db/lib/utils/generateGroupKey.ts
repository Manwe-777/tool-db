import arrayBufferToHex from "./encoding/arrayBufferToHex";

/**
 * Generate a random 256-bit symmetric key for group encryption.
 * Returns the key as a hex string for easy storage and transmission.
 */
export default function generateGroupKey(): string {
  const key = crypto.getRandomValues(new Uint8Array(32));
  return arrayBufferToHex(key.buffer);
}

