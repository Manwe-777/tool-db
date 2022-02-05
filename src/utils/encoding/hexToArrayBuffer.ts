export default function hexToArrayBuffer(hex: string): ArrayBuffer {
  const pairs = hex.toUpperCase().match(/[\dA-F]{2}/gi);

  if (!pairs) return new Uint8Array();

  // convert the octets to integers
  const integers = pairs.map((s) => {
    return parseInt(s, 16);
  });

  const array = new Uint8Array(integers);
  return array.buffer;
}
