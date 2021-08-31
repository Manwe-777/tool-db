import getCrypto from "../getCrypto";

export default function generateIv() {
  const crypto = getCrypto();
  return crypto.getRandomValues(new Uint8Array(12));
}
