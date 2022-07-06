import { ToolDbUserAdapter, sha256 } from "..";

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
