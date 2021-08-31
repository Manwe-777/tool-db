import stringToArrayBuffer from "../stringToArrayBuffer";

export default function decodeKeyString(keydataB64: string): ArrayBuffer {
  const keydataS = global.atob(keydataB64);
  const keydata = stringToArrayBuffer(keydataS);
  return keydata;
}
