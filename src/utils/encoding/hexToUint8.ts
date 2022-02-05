import hexToArrayBuffer from "./hexToArrayBuffer";

export default function hexToUint8(hex: string) {
  return new Uint8Array(hexToArrayBuffer(hex));
}
