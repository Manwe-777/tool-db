import { BinaryDocument } from "automerge";
import fromBase64 from "./fromBase64";

export default function base64ToBinaryDocument(based: string): BinaryDocument {
  const str = fromBase64(based);

  const buf = new ArrayBuffer(str.length);
  const bufView = new Uint8Array(buf);
  for (let i = 0, strLen = str.length; i < strLen; i += 1) {
    bufView[i] = str.charCodeAt(i);
  }

  (bufView as BinaryDocument).__binaryDocument = true;
  return bufView as BinaryDocument;
}
