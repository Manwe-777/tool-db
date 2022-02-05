import Automerge from "automerge";

export default function uint8ArrayToHex(
  binary: Uint8Array | Automerge.BinaryDocument
) {
  return Buffer.from(binary).toString("hex").toUpperCase();
}
