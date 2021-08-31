import { Crypto } from "@peculiar/webcrypto";

export default function getCrypto(this: any): typeof window.crypto {
  if (typeof window === "undefined") {
    return require("crypto").webcrypto;
  }

  // eslint-disable-next-line no-undef
  if (process && process.env.JEST_WORKER_ID) {
    global.crypto = new Crypto();
  }

  if (global.crypto) {
    return global.crypto;
  }

  return window.crypto;
}
