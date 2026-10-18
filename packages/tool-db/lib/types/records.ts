export enum VerifyResult {
  CustomVerificationFailed = "CustomVerificationFailed",
  InvalidData = "InvalidData",
  InvalidTimestamp = "InvalidTimestamp",
  AddressMismatch = "AddressMismatch",
  InvalidSignature = "InvalidSignature",
  Verified = "Verified",
}

/**
 * A verified piece of data: a value, or a CRDT change set. This is what key
 * listeners and custom verificators get, built from its Nostr event.
 */
export interface VerificationData<T = any> {
  /**
   * Key, with the user namespace if any (":pubkey.key")
   */
  k: string;
  /**
   * Author (public key)
   */
  a: string;
  /**
   * Timestamp, in milliseconds
   */
  t: number;
  /**
   * Event id
   */
  h: string;
  /**
   * Event signature
   */
  s: string;
  /**
   * Value, or the changes of a CRDT change set
   */
  v: T;
  /**
   * CRDT type, null for values
   */
  c: string | null;
}
