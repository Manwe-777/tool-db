import { VerificationData, VerifyResult } from "..";

export interface CustomVerificator<T = any> {
  key: string;
  fn: (msg: VerificationData<T>, previous: any) => Promise<boolean>;
}

/**
 * What verification needs from its owner (a database or a relay node)
 */
export interface VerifyContext {
  /**
   * App topic, keys of other topics are not valid
   */
  topic: string;
  customVerificators: (CustomVerificator | null)[];
  /**
   * The previous data of a key, given to custom verificators
   */
  loadPrevious: (finalKey: string) => Promise<any>;
}

// Max clock shift allowed for events
export const MAX_CLOCK_SHIFT_SECONDS = 30;

export const isInFuture = (createdAt: number) =>
  createdAt > Date.now() / 1000 + MAX_CLOCK_SHIFT_SECONDS;

/**
 * Runs all the custom verificators matching the key of this data.
 * All of them must pass.
 */
export async function runCustomVerificators(
  ctx: VerifyContext,
  data: VerificationData
): Promise<VerifyResult> {
  const listeners = ctx.customVerificators.filter(
    (listener) => listener && data.k.startsWith(listener.key)
  );

  if (listeners.length === 0) {
    return VerifyResult.Verified;
  }

  let previous: any = undefined;
  try {
    previous = await ctx.loadPrevious(data.k);
  } catch (e) {
    // do nothing
  }

  const results = await Promise.all(
    listeners.map((listener) =>
      Promise.resolve()
        .then(() => listener!.fn(data, previous))
        .catch(() => false)
    )
  );

  return results.every(Boolean)
    ? VerifyResult.Verified
    : VerifyResult.CustomVerificationFailed;
}
