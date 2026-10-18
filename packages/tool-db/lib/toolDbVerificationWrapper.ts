import { ToolDb, VerificationData, VerifyResult } from ".";

/**
 * Runs all the custom verificators matching the key of this data.
 * All of them must pass.
 * @param data data to verify
 * @param loadPrevious returns the previously stored value of this key, only
 * called if there are matching verificators.
 * @returns VerifyResult
 */
export async function runCustomVerificators(
  this: ToolDb,
  data: VerificationData<any>,
  loadPrevious: () => Promise<any>
): Promise<VerifyResult> {
  const listeners = this._customVerificator.filter(
    (listener) => listener && data.k && data.k.startsWith(listener.key)
  );

  if (listeners.length === 0) {
    return VerifyResult.Verified;
  }

  let previousData: any = undefined;
  try {
    previousData = await loadPrevious();
  } catch (e) {
    // do nothing
  }

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

  // Get the previously stored value of this key
  return runCustomVerificators.call(this, data, async () =>
    JSON.parse(await this.store.get(data.k))
  );
}
