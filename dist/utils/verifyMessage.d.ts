import { GraphEntryValue } from "../types/graph";
import { VerifyResult } from "../types/message";
/**
 * Verifies a message validity (PoW, pubKey, timestamp, signatures)
 * @param msg AnyMessage
 * @returns boolean or undefined if the message type does not match
 */
export default function verifyMessage<T>(msg: Partial<GraphEntryValue<T>>): Promise<VerifyResult>;
