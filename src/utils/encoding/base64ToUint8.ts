import fromBase64 from "./fromBase64";

export default function base64ToUint8(based: string): Uint8Array {
  const str = fromBase64(based);

  const buf = new ArrayBuffer(str.length);
  const bufView = new Uint8Array(buf);
  for (let i = 0, strLen = str.length; i < strLen; i += 1) {
    bufView[i] = str.charCodeAt(i);
  }
  return bufView;
}
