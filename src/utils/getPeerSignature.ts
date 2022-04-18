import sha256 from "./sha256";

import { Account } from "web3-core";

export default function getPeerSignature(
  account: Account,
  topic: string,
  timestamp: number,
  host: string,
  port: number
) {
  const dataToSign = sha256(`${topic}-${timestamp}-${host}:${port}`);
  return account.sign(dataToSign);
}
