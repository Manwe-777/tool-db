import { AnyMessage, VerifyResult } from "../types/message";
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
export default async function verifyMessage(
  msg: AnyMessage
): Promise<VerifyResult> {
  // console.log("verify: ", msg);
  // No verification required
  if (msg.type === "put") {
    const strData = JSON.stringify(msg.val.value);

    if (msg.val.timestamp > new Date().getTime()) {
      // console.warn("Invalid message timestamp.");
      return VerifyResult.InvalidTimestamp;
    }

    // This is a user namespace
    let publicKeyNamespace: false | string = false;
    if (msg.val.key.slice(0, 1) == "~") {
      publicKeyNamespace = msg.val.key.split(".")[0].slice(1);
    }

    const pubKeyString = msg.val.pub;

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
      sha256(
        `${strData}${pubKeyString}${msg.val.timestamp}${msg.val.nonce}`
      ) !== msg.hash
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

    const verified = await verifyData(
      msg.hash,
      fromBase64(msg.val.sig),
      pubKey
    );
    // console.warn(`Signature validation: ${verified ? "Sucess" : "Failed"}`);

    return verified ? VerifyResult.Verified : VerifyResult.InvalidSignature;
  }
  // if (msg.type === "get" || msg.type === "get-peersync" || msg.type === "set-peersync") {
  return VerifyResult.Verified;
  // }
  // return undefined;
}
