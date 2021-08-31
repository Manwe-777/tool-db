export default function getCrypto(this: any): typeof window.crypto {
  return global.crypto;
}
