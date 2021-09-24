import { ToolDbEntryValue } from "../types/graph";
import { VerifyResult } from "../types/message";
/**
 * Verifies a message validity (PoW, pubKey, timestamp, signatures)
 * @param msg AnyMessage
 * @param pow amount of proof of work required, number of leading zeroes (default is 0/no pow)
 * @returns boolean or undefined if the message type does not match
 */
export default function verifyMessage<T>(msg: Partial<ToolDbEntryValue<T>>, pow?: number): Promise<VerifyResult>;
