/* eslint-disable no-undef */
/* eslint-disable global-require */
export * from "./types/graph";
export * from "./types/message";

global.Buffer = global.Buffer || require("buffer").Buffer;

if (typeof btoa === "undefined") {
  global.btoa = (str) => {
    return Buffer.from(str, "binary").toString("base64");
  };
}

if (typeof atob === "undefined") {
  global.atob = (b64Encoded) => {
    return Buffer.from(b64Encoded, "base64").toString("binary");
  };
}

if (typeof window === "undefined") {
  global.crypto = require("crypto").webcrypto;
}

export { default as proofOfWork } from "./utils/proofOfWork";
export { default as sha1 } from "./utils/sha1";
export { default as sha256 } from "./utils/sha256";
export { default as signData } from "./utils/signData";
export { default as arrayBufferToBase64 } from "./utils/arrayBufferToBase64";
export { default as arrayBufferToString } from "./utils/arrayBufferToString";
export { default as base64ToArrayBuffer } from "./utils/base64ToArrayBuffer";
export { default as base64ToBinaryChange } from "./utils/base64ToBinaryChange";
export { default as base64ToBinaryDocument } from "./utils/base64ToBinaryDocument";
export { default as base64ToUint8 } from "./utils/base64ToUint8";
export { default as fromBase64 } from "./utils/fromBase64";
export { default as generateIv } from "./utils/generateIv";
export { default as randomAnimal } from "./utils/randomAnimal";
export { default as stringToArrayBuffer } from "./utils/stringToArrayBuffer";
export { default as textRandom } from "./utils/textRandom";
export { default as toBase64 } from "./utils/toBase64";
export { default as uint8ToBase64 } from "./utils/uint8ToBase64";
export { default as verifyMessage } from "./utils/verifyMessage";

export { default as decodeKeyString } from "./utils/crypto/decodeKeyString";
export { default as decryptData } from "./utils/crypto/decryptData";
export { default as decryptWithPass } from "./utils/crypto/decryptWithPass";
export { default as deriveSecret } from "./utils/crypto/deriveSecret";
export { default as encodeKeyString } from "./utils/crypto/encodeKeyString";
export { default as encryptData } from "./utils/crypto/encryptData";
export { default as encryptWithPass } from "./utils/crypto/encryptWithPass";
export { default as exportKey } from "./utils/crypto/exportKey";
export { default as generateKeyFromPassword } from "./utils/crypto/generateKeyFromPassword";
export { default as generateKeyPair } from "./utils/crypto/generateKeyPair";
export { default as generateKeysComb } from "./utils/crypto/generateKeysComb";
export { default as importKey } from "./utils/crypto/importKey";
export { default as loadKeysComb } from "./utils/crypto/loadKeysComb";
export { default as saveKeysComb } from "./utils/crypto/saveKeysComb";
export { default as verifyData } from "./utils/crypto/verifyData";

export { default as ToolDb } from "./tooldb";
