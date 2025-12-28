export default function arrayBufferToString(arr: ArrayBuffer): string {
  const decoder = new TextDecoder();
  return decoder.decode(arr);
}
