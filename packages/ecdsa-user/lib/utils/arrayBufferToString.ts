export default function arrayBufferToString(arr: ArrayBuffer) {
  const byteArray = new Uint8Array(arr);
  let byteString = "";
  for (let i = 0; i < byteArray.byteLength; i += 1) {
    byteString += String.fromCodePoint(byteArray[i]);
  }
  return byteString;
}
