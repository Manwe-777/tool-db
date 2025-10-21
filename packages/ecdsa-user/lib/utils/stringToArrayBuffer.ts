export default function stringToArrayBuffer(str: string): Uint8Array {
  // Use TextEncoder which is the standard way to convert strings to buffers for WebCrypto API
  // This works in both browser and Node.js environments
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(str);
  }
  
  // Fallback for older environments
  const buf = new ArrayBuffer(str.length);
  const bufView = new Uint8Array(buf);
  for (let i = 0, strLen = str.length; i < strLen; i += 1) {
    bufView[i] = str.charCodeAt(i);
  }
  return bufView;
}
