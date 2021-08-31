import getCrypto from "../../getCrypto";
import { KeyPair } from "./generateKeyPair";

export default function deriveSecret(keys: KeyPair) {
  const crypto = getCrypto();
  return crypto.subtle.deriveKey(
    {
      name: "ECDH",
      public: keys.publicKey,
    },
    keys.privateKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
}
