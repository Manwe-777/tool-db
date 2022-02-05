export default function arrayBufferToHex(buffer: ArrayBuffer) {
  const data_view = new DataView(buffer);
  let iii;
  let len;
  let hex = "";
  let c;

  for (iii = 0, len = data_view.byteLength; iii < len; iii += 1) {
    c = data_view.getUint8(iii).toString(16);
    if (c.length < 2) {
      c = "0" + c;
    }

    hex += c;
  }

  return hex;
}
