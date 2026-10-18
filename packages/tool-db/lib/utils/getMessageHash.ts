import { sha256 } from "..";

/**
 * Computes the hash that binds a message value to its author and timestamp.
 * This is what gets signed, so any change to the value invalidates the signature.
 * The nonce is a leftover from the removed proof of work; new messages always
 * use 0, but older stored messages may carry other values.
 * @param value JSON encoded value
 * @param address Author address
 * @param timestamp Message timestamp
 * @param nonce Message nonce (default 0)
 * @returns hex encoded sha256 hash
 */
export default function getMessageHash(
  value: string,
  address: string,
  timestamp: number,
  nonce = 0
): string {
  return sha256(`${value}${address}${timestamp}${nonce}`);
}
