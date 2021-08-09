import fromBase64 from "./fromBase64";
import stringToArrayBuffer from "./stringToArrayBuffer";

export default function base64ToArrayBuffer(str: string): ArrayBuffer {
  return stringToArrayBuffer(fromBase64(str));
}
