export default function exportKey(
  format: "jwk" | "spki" | "pkcs8",
  key: CryptoKey
) {
  return window.crypto.subtle.exportKey(
    format, // can be "jwk" (public or private), "spki" (public only), or "pkcs8" (private only)
    key // can be a publicKey or privateKey, as long as extractable was true,
  );
}
