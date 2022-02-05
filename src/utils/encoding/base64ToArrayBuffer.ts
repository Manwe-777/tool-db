import stringToArrayBuffer from "./stringToArrayBuffer";
import fromBase64 from "./fromBase64";

export default function base64ToArrayBuffer(str: string): ArrayBuffer {
  return stringToArrayBuffer(fromBase64(str));
}
