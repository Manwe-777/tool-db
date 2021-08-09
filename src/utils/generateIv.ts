export default function generateIv() {
  return window.crypto.getRandomValues(new Uint8Array(12));
}
