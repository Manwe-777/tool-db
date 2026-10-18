import { sha256 as nobleSha256 } from "@noble/hashes/sha256";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils";

export default function sha256(data: string | Uint8Array): string {
  return bytesToHex(
    nobleSha256(typeof data === "string" ? utf8ToBytes(data) : data)
  );
}
