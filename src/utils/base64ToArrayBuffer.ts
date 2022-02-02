import { fromBase64, stringToArrayBuffer } from "..";

export default function base64ToArrayBuffer(str: string): ArrayBuffer {
  return stringToArrayBuffer(fromBase64(str));
}
