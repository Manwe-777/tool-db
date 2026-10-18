import { ToolDb, VerificationData, VerifyResult } from ".";

export default async function toolDbVerificationWrapper(
  this: ToolDb,
  data: VerificationData<any>
): Promise<VerifyResult> {
  // This wrapper function adds our custom verification functions to all messages.
  // Custom verificators can only add restrictions, never override a failed check.
  const verified = await this.verifyMessage(data);
  if (verified !== VerifyResult.Verified) {
    return verified;
  }

  const listeners = this._customVerificator.filter(
    (listener) => listener && data.k && data.k.startsWith(listener.key)
  );

  if (listeners.length === 0) {
    return verified;
  }

  // Get the previously stored value of this key
  let previousData: any = undefined;
  try {
    previousData = JSON.parse(await this.store.get(data.k));
  } catch (e) {
    // do nothing
  }

  // All matching verificators must pass
  const results = await Promise.all(
    listeners.map((listener) =>
      Promise.resolve()
        .then(() => listener!.fn(data, previousData))
        .catch(() => false)
    )
  );

  return results.every(Boolean)
    ? VerifyResult.Verified
    : VerifyResult.CustomVerificationFailed;
}
