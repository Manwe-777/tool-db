import arrayBufferToHex from "../arrayBufferToHex";

export default function encodeKeyString(keydata: ArrayBuffer) {
  const keydataHexed = arrayBufferToHex(keydata);
  return keydataHexed;
}
