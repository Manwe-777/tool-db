import arrayBufferToString from "../arrayBufferToString";

export default function encodeKeyString(keydata: ArrayBuffer) {
  const keydataS = arrayBufferToString(keydata);
  const keydataB64 = global.btoa(keydataS);
  return keydataB64;
}
