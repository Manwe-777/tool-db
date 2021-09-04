import { GraphEntryValue } from "../types/graph";
import { VerifyResult } from "../types/message";
import decodeKeyString from "./crypto/decodeKeyString";
import importKey from "./crypto/importKey";
import verifyData from "./crypto/verifyData";
import fromBase64 from "./fromBase64";
import sha256 from "./sha256";

/**
 * Verifies a message validity (PoW, pubKey, timestamp, signatures)
 * @param msg AnyMessage
 * @returns boolean or undefined if the message type does not match
 */
export default async function verifyMessage<T>(
  msg: GraphEntryValue<T>
): Promise<VerifyResult> {
  // console.log("verify: ", msg);
  const strData = JSON.stringify(msg.value);

  // Max clock shift allowed is ten seconds
  if (msg.timestamp > new Date().getTime() + 10000) {
    // console.warn("Invalid message timestamp.");
    return VerifyResult.InvalidTimestamp;
  }

  // This is a user namespace
  let publicKeyNamespace: false | string = false;
  if (msg.key.slice(0, 1) == "~") {
    publicKeyNamespace = msg.key.split(".")[0].slice(1);
  }

  const pubKeyString = msg.pub;

  if (publicKeyNamespace && publicKeyNamespace !== pubKeyString) {
    // console.warn("Provided pub keys do not match");
    return VerifyResult.PubKeyMismatch;
  }

  // Verify hash and nonce (adjust zeroes for difficulty of the network)
  // While this POW does not enforce security per-se, it does make it harder
  // for attackers to spam the network, and could be adjusted by peers.
  if (msg.hash.slice(0, 3) !== "000") {
    // console.warn("No valid hash (no pow)");
    return VerifyResult.NoProofOfWork;
  }

  if (
    sha256(`${strData}${pubKeyString}${msg.timestamp}${msg.nonce}`) !== msg.hash
  ) {
    // console.warn("Specified hash does not generate a valid pow");
    return VerifyResult.InvalidHashNonce;
  }

  const pubKey = await importKey(
    decodeKeyString(pubKeyString),
    "spki",
    "ECDSA",
    ["verify"]
  );

  // console.log("Message verification: ", msg.hash, pubKeyString, msg.val.sig);

  const verified = await verifyData(msg.hash, fromBase64(msg.sig), pubKey);
  // console.warn(`Signature validation: ${verified ? "Sucess" : "Failed"}`);

  return verified ? VerifyResult.Verified : VerifyResult.InvalidSignature;
}
