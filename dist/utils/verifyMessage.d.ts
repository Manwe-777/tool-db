import { AnyMessage, VerifyResult } from "../types/message";
/**
 * Verifies a message validity (PoW, pubKey, timestamp, signatures)
 * @param msg AnyMessage
 * @returns boolean or undefined if the message type does not match
 */
export default function verifyMessage(msg: AnyMessage): Promise<VerifyResult>;
