import { ToolDb, VerifyResult, VerificationData, sha256 } from "..";

/**
 * Verifies a message validity (PoW, Address, timestamp, signatures)
 * @param msg AnyMessage
 * @param pow amount of proof of work required, number of leading zeroes (default is 0/no pow)
 * @returns boolean or undefined if the message type does not match
 */
export default async function verifyMessage<T>(
  this: ToolDb,
  msg: Partial<VerificationData<T>>,
  pow: number | null = 0
): Promise<VerifyResult> {
  // this.logger("verify: ", msg);
  const strData = JSON.stringify(msg.v);

  if (
    msg.t === undefined ||
    msg.k === undefined ||
    msg.h === undefined ||
    msg.a === undefined ||
    msg.s === undefined ||
    msg.c === undefined
  ) {
    return VerifyResult.InvalidData;
  }

  // Max clock shift allowed is 30 seconds.
  // Ten seconds was my original threshold but it failed some times.
  if (msg.t > new Date().getTime() + 30000) {
    // this.logger("Invalid message timestamp.");
    return VerifyResult.InvalidTimestamp;
  }

  // This is a user namespace
  let addressNamespace: false | string = false;
  if (msg.k.slice(0, 1) == ":") {
    addressNamespace = msg.k.split(".")[0].slice(1);
  }

  // Frozen namespace (==) - first writer owns the key forever
  // But we need to compare timestamps to determine who was actually first
  if (msg.k.slice(0, 2) == "==") {
    const key = msg.k;
    const data = await this.store
      .get(key)
      .then((data) => {
        try {
          const message = JSON.parse(data);
          return message;
        } catch (e) {
          return null;
        }
      })
      .catch(() => {
        return null;
      });
    
    // If data exists with a different author, compare timestamps
    // The OLDER timestamp wins (first writer owns forever)
    if (data && data.a !== msg.a) {
      if (data.t <= msg.t) {
        // Local data is older or same age - reject incoming
        return VerifyResult.CantOverwrite;
      }
      // Incoming data is older - let it through to handlePut
      // where it will replace our local data
    }
  }

  if (addressNamespace && addressNamespace !== msg.a) {
    // this.logger("Provided address does not match");
    return VerifyResult.AddressMismatch;
  }

  // Verify hash and nonce (adjust zeroes for difficulty of the network)
  // While this POW does not enforce security per-se, it does make it harder
  // for attackers to spam the network, and could be adjusted by peers.
  // When pow is null, skip POW verification entirely (useful for testing/CI)
  if (pow !== null && pow > 0) {
    if (msg.h.slice(0, pow) !== new Array(pow).fill("0").join("")) {
      // this.logger("No valid hash (no pow)");
      return VerifyResult.NoProofOfWork;
    }

    if (sha256(`${strData}${msg.a}${msg.t}${msg.n}`) !== msg.h) {
      // this.logger("Specified hash does not generate a valid pow");
      return VerifyResult.InvalidHashNonce;
    }
  }

  const verified = this.userAccount
    ? await this.userAccount.verifySignature(msg)
    : false;
  // this.logger(`Signature validation: ${verified ? "Sucess" : "Failed"}`);

  return verified ? VerifyResult.Verified : VerifyResult.InvalidSignature;
}
