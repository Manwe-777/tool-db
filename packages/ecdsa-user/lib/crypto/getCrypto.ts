export default function getCrypto(this: any): typeof window.crypto {
  if (typeof window === "undefined") {
    // Node.js environment
    // eslint-disable-next-line global-require
    return require("crypto").webcrypto;
  }

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
