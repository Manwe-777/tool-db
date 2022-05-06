export default function uint8ArrayToHex(binary: Uint8Array) {
  return Buffer.from(binary).toString("hex").toLowerCase();
}
