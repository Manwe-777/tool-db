import { ToolDbEntryValue } from "./graph";

export enum VerifyResult {
  CustomVerificationFailed = -8,
  InvalidData = -7,
  InvalidVerification = -6,
  InvalidTimestamp = -5,
  PubKeyMismatch = -4,
  NoProofOfWork = -3,
  InvalidHashNonce = -2,
  InvalidSignature = -1,
  Verified = 1,
}

export type MessageType = "get" | "put";

export interface BaseMessage {
  type: MessageType;
  id: string; // unique random id for the message, not content related, to ack back
}

export interface GetMessage extends BaseMessage {
  type: "get";
  key: string;
  to: string[]; // who was this message sent to already
}

export interface PutMessage extends BaseMessage {
  type: "put";
  data: ToolDbEntryValue;
}

export type ToolDbMessage = GetMessage | PutMessage;
