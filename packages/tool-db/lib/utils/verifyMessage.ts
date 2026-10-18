import { ToolDb, VerifyResult, VerificationData, getMessageHash } from "..";

/**
 * Verifies a message validity (hash, address, timestamp, signatures)
 * @param msg AnyMessage
 * @returns VerifyResult
 */
export default async function verifyMessage<T>(
  this: ToolDb,
  msg: Partial<VerificationData<T>>
): Promise<VerifyResult> {
  // this.logger("verify: ", msg);
  const strData = JSON.stringify(msg.v);

  if (
    msg.t === undefined ||
    msg.k === undefined ||
    msg.h === undefined ||
    msg.a === undefined ||
    msg.s === undefined ||
    msg.n === undefined ||
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

  // The signature only covers the hash, so the hash must be checked against
  // the actual value or anyone could swap the value of a signed message.
  if (getMessageHash(strData, msg.a, msg.t, msg.n) !== msg.h) {
    return VerifyResult.InvalidHash;
  }

  const verified = this.userAccount
    ? await this.userAccount.verifySignature(msg)
    : false;
  // this.logger(`Signature validation: ${verified ? "Sucess" : "Failed"}`);

  return verified ? VerifyResult.Verified : VerifyResult.InvalidSignature;
}
