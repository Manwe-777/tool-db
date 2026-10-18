import { sha1 as nobleSha1 } from "@noble/hashes/legacy";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils";

export default function sha1(str: string): string {
  return bytesToHex(nobleSha1(utf8ToBytes(str)));
}
