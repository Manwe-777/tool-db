import { arrayBufferToHex } from "tool-db";

import getCrypto from "./getCrypto";

export interface ECDHKeyPair {
  publicKey: string; // hex-encoded SPKI format
  privateKey: string; // hex-encoded PKCS8 format
}

/**
 * Generate an ECDH key pair for encryption purposes.
 * Returns hex-encoded keys for easy storage and transmission.
 */
export default async function generateECDHKeyPair(): Promise<ECDHKeyPair> {
  const crypto = getCrypto();

  const keyPair = await crypto.subtle.generateKey(
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true, // extractable
    ["deriveKey", "deriveBits"]
  );

  const publicKeyBuffer = await crypto.subtle.exportKey(
    "spki",
    keyPair.publicKey
  );
  const privateKeyBuffer = await crypto.subtle.exportKey(
    "pkcs8",
    keyPair.privateKey
  );

  return {
    publicKey: arrayBufferToHex(publicKeyBuffer),
    privateKey: arrayBufferToHex(privateKeyBuffer),
  };
}

