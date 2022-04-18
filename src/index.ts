/* eslint-disable no-undef */
/* eslint-disable global-require */

export * from "./types/tooldb";
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

export { default as generateIv } from "./utils/generateIv";
export { default as randomAnimal } from "./utils/randomAnimal";
export { default as textRandom } from "./utils/textRandom";
export { default as stringToArrayBuffer } from "./utils/encoding/stringToArrayBuffer";
export { default as verifyMessage } from "./utils/verifyMessage";
export { default as verifyPeer } from "./utils/verifyPeer";

export { default as arrayBufferToBase64 } from "./utils/encoding/arrayBufferToBase64";
export { default as arrayBufferToString } from "./utils/encoding/arrayBufferToString";
export { default as arrayBufferToHex } from "./utils/encoding/arrayBufferToHex";
export { default as base64ToArrayBuffer } from "./utils/encoding/base64ToArrayBuffer";
export { default as base64ToBinaryChange } from "./utils/encoding/base64ToBinaryChange";
export { default as base64ToBinaryDocument } from "./utils/encoding/base64ToBinaryDocument";
export { default as base64ToUint8 } from "./utils/encoding/base64ToUint8";
export { default as base64ToHex } from "./utils/encoding/base64ToHex";
export { default as hexToArrayBuffer } from "./utils/encoding/hexToArrayBuffer";
export { default as hexToBase64 } from "./utils/encoding/hexToBase64";
export { default as hexToString } from "./utils/encoding/hexToString";
export { default as hexToUint8 } from "./utils/encoding/hexToUint8";
export { default as fromBase64 } from "./utils/encoding/fromBase64";
export { default as uint8ToBase64 } from "./utils/encoding/uint8ToBase64";
export { default as uint8ArrayToHex } from "./utils/encoding/uint8ArrayToHex";
export { default as toBase64 } from "./utils/encoding/toBase64";

export { default as decryptWithPass } from "./utils/crypto/decryptWithPass";
export { default as encryptWithPass } from "./utils/crypto/encryptWithPass";
export { default as generateKeyFromPassword } from "./utils/crypto/generateKeyFromPassword";

export { default as toolDbNetwork } from "./toolDbNetwork";
export { default as toolDbWebrtc } from "./toolDbWebrtc";

export { default as handleCrdt } from "./messageHandlers/handleCrdt";
export { default as handleCrdtGet } from "./messageHandlers/handleCrdtGet";
export { default as handleCrdtPut } from "./messageHandlers/handleCrdtPut";
export { default as handleGet } from "./messageHandlers/handleGet";
export { default as handlePing } from "./messageHandlers/handlePing";
export { default as handlePong } from "./messageHandlers/handlePong";
export { default as handlePut } from "./messageHandlers/handlePut";
export { default as handleQuery } from "./messageHandlers/handleQuery";
export { default as handleSubscribe } from "./messageHandlers/handleSubscribe";

export { default as ToolDb } from "./tooldb";
