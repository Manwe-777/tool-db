import { toBase64 } from "..";
import hexToString from "./hexToString";

export default function hexToBase64(hexString: string) {
  return toBase64(hexToString(hexString));
}
