import crypto, { BinaryLike } from "crypto";

export default function sha256(str: BinaryLike): string {
  const hash = crypto.createHash("sha256");
  hash.update(str);
  return hash.digest("hex");
}
