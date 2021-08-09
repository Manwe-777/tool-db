import arrayBufferToString from "./arrayBufferToString";
import toBase64 from "./toBase64";

export default function arrayBufferToBase64(arr: ArrayBuffer): string {
  return toBase64(arrayBufferToString(arr));
}
