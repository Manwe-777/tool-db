import hexToArrayBuffer from "../hexToArrayBuffer";

export default function decodeKeyString(keyDataHex: string): ArrayBuffer {
  const keydata = hexToArrayBuffer(keyDataHex);
  return keydata;
}
