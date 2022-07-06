export default function fromBase64(str: string) {
  return decodeURIComponent(escape(global.atob(str)));
}
