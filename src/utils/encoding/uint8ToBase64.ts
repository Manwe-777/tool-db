import { BinaryChange } from "automerge";
import toBase64 from "./toBase64";

export default function uint8ToBase64(
  byteArray: Uint8Array | BinaryChange
): string {
  let byteString = "";
  for (let i = 0; i < byteArray.byteLength; i += 1) {
    byteString += String.fromCodePoint(byteArray[i]);
  }

  return toBase64(byteString);
}
