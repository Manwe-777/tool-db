export default function toBase64(str: string) {
  return global.btoa(unescape(encodeURIComponent(str)));
}
