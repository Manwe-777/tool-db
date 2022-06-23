import { ToolDbUserAdapter } from "../types/tooldb";
import sha256 from "./sha256";

export default function getPeerSignature(
  account: ToolDbUserAdapter,
  topic: string,
  timestamp: number,
  host: string,
  port: number
) {
  const dataToSign = sha256(`${topic}-${timestamp}-${host}:${port}`);
  return account.signData(dataToSign);
}
