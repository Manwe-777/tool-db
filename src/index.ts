/* eslint-disable no-undef */
/* eslint-disable global-require */

export * from "./types/tooldb";
export * from "./types/message";

global.Buffer = global.Buffer || require("buffer").Buffer;

if (typeof window === "undefined") {
  global.crypto = require("crypto").webcrypto;
}

export { default as BaseCrdt } from "./crdt/baseCrdt";
export { default as CounterCrdt } from "./crdt/counterCrdt";
export { default as ListCrdt } from "./crdt/listCrdt";
export { default as MapCrdt } from "./crdt/mapCrdt";

export { default as proofOfWork } from "./utils/proofOfWork";
export { default as sha1 } from "./utils/sha1";
export { default as sha256 } from "./utils/sha256";

export { default as generateIv } from "./utils/generateIv";
export { default as randomAnimal } from "./utils/randomAnimal";
export { default as textRandom } from "./utils/textRandom";
export { default as stringToArrayBuffer } from "./utils/encoding/stringToArrayBuffer";
export { default as verifyMessage } from "./utils/verifyMessage";
export { default as verifyPeer } from "./utils/verifyPeer";

export { default as arrayBufferToString } from "./utils/encoding/arrayBufferToString";
export { default as arrayBufferToHex } from "./utils/encoding/arrayBufferToHex";
export { default as hexToArrayBuffer } from "./utils/encoding/hexToArrayBuffer";
export { default as hexToString } from "./utils/encoding/hexToString";
export { default as hexToUint8 } from "./utils/encoding/hexToUint8";

export { default as generateKeyFromPassword } from "./utils/crypto/generateKeyFromPassword";
export { default as decryptWithPass } from "./utils/crypto/decryptWithPass";
export { default as encryptWithPass } from "./utils/crypto/encryptWithPass";

export { default as ToolDbNetworkAdapter } from "./toolDbNetworkAdapter";
export { default as ToolDbWebsocket } from "./toolDbWebsocket";
export { default as ToolDbWebrtc } from "./toolDbWebrtc";

export * from "./types/tooldb";
export * from "./types/message";
export * from "./crdt/baseCrdt";
export * from "./crdt/counterCrdt";
export * from "./crdt/listCrdt";
export * from "./crdt/mapCrdt";

export { default as ToolDbWeb3User } from "./toolDbWeb3User";

export { default as handleSubscribe } from "./messageHandlers/handleSubscribe";
export { default as handleCrdtGet } from "./messageHandlers/handleCrdtGet";
export { default as handleCrdtPut } from "./messageHandlers/handleCrdtPut";
export { default as handleQuery } from "./messageHandlers/handleQuery";
export { default as handlePing } from "./messageHandlers/handlePing";
export { default as handlePong } from "./messageHandlers/handlePong";
export { default as handleGet } from "./messageHandlers/handleGet";
export { default as handlePut } from "./messageHandlers/handlePut";

export { default as ToolDb } from "./tooldb";
