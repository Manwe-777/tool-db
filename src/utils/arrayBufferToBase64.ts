import { arrayBufferToString, toBase64 } from "..";

export default function arrayBufferToBase64(arr: ArrayBuffer): string {
  return toBase64(arrayBufferToString(arr));
}
