export default function toBase64(str: string) {
  return window.btoa(unescape(encodeURIComponent(str)));
}
