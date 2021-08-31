export default function getCrypto(this: any): typeof window.crypto {
  if (typeof window === "undefined") {
    return require("crypto").webcrypto;
  }

  return window.crypto;
}
