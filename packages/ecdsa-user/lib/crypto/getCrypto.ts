export default function getCrypto(this: any): typeof globalThis.crypto {
  // Check for browser or web worker environment
  if (typeof globalThis.crypto?.subtle !== "undefined") {
    return globalThis.crypto;
  }

  // Check window.crypto for older browser compatibility
  if (typeof window !== "undefined" && window.crypto?.subtle) {
    return window.crypto;
  }

  // Node.js environment
  if (typeof window === "undefined" && typeof self === "undefined") {
    // eslint-disable-next-line global-require
    return require("crypto").webcrypto;
  }

  throw new Error(
    "Web Crypto API (crypto.subtle) is not available. " +
      "This usually means the page is not served over HTTPS. " +
      "Please use HTTPS or localhost for secure crypto operations."
  );
}
