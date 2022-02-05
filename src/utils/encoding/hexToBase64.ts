import hexToString from "./hexToString";
import toBase64 from "./toBase64";

export default function hexToBase64(hexString: string) {
  return toBase64(hexToString(hexString));
}
