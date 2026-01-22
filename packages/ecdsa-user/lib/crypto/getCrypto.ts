export default function getCrypto(this: any): typeof window.crypto {
  // Browser environment (window context)
  if (typeof window !== "undefined" && window.crypto) {
    // Check if crypto.subtle is available (requires HTTPS or localhost)
    if (!window.crypto?.subtle) {
      throw new Error(
        "Web Crypto API (crypto.subtle) is not available. " +
        "This usually means the page is not served over HTTPS. " +
        "Please use HTTPS or localhost for secure crypto operations."
      );
    }
    return window.crypto;
  }

  // Web Worker environment (self context)
  if (typeof self !== "undefined" && typeof crypto !== "undefined") {
    return crypto;
  }

  // Node.js environment
  // eslint-disable-next-line global-require
  return require("crypto").webcrypto;
}
