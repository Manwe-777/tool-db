import getCrypto from "./getCrypto";

export default function base64ToPubkey(str: string) {
  const crypto = getCrypto();

  return crypto.subtle.importKey(
    "jwk",
    {
      crv: "P-256",
      ext: true,
      key_ops: ["verify"],
      kty: "EC",
      x: str.slice(0, 43),
      y: str.slice(43),
    },
    "ECDSA",
    true,
    ["verify"]
  );
}
