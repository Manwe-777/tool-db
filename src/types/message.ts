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

export interface VerificationData<T = any> {
  key: string; // Key/id
  pub: string; // public key
  non: number; // nonce
  hash: string; // hash of JSON.stringify(value) + nonce
  time: number; // Timestamp this was created
  sig: string; // signature
  val: T; // value
}

export type MessageType = "get" | "put";

export interface BaseMessage {
  type: MessageType;
  id: string; // unique random id for the message, to ack back
}

export interface GetMessage extends BaseMessage {
  type: "get";
  key: string; // key we want to get
  to: string[]; // who was this message sent to already
}

export interface PutMessage extends BaseMessage, VerificationData {
  type: "put";
}

export type ToolDbMessage = GetMessage | PutMessage;
