import getCrypto from "./getCrypto";

export default function pubkeyToBase64(pubkey: CryptoKey) {
  const crypto = getCrypto();

  return crypto.subtle.exportKey("jwk", pubkey).then((jwk) => {
    return `${jwk.x}${jwk.y}`;
  });
}
