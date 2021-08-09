import crypto from "crypto";

export default function sha1(str: string, hex = false): string {
  const hash = crypto.createHash("sha1");
  hash.update(str);
  return hash.digest(hex ? "hex" : "base64");
}
