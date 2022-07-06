export default function getCrypto(this: any): typeof window.crypto {
  if (typeof window === "undefined") {
    // eslint-disable-next-line global-require
    return require("crypto").webcrypto;
  }

  return window.crypto;
}
