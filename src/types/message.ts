import { Peer } from "./tooldb";

export enum VerifyResult {
  CustomVerificationFailed = "CustomVerificationFailed",
  InvalidData = "InvalidData",
  InvalidVerification = "InvalidVerification",
  CantOverwrite = "CantOverwrite",
  InvalidTimestamp = "InvalidTimestamp",
  AddressMismatch = "AddressMismatch",
  NoProofOfWork = "NoProofOfWork",
  InvalidHashNonce = "InvalidHashNonce",
  InvalidSignature = "InvalidSignature",
  Verified = "Verified",
}

export interface VerificationData<T = any> {
  /**
   * Key/id
   */
  k: string;
  /**
   * Address
   */
  a: string;
  /**
   * Nonce
   */
  n: number;
  /**
   * Hash of JSON.stringify(value) + nonce
   */
  h: string;
  /**
   * Timestamp this was created
   */
  t: number;
  /**
   * Signature
   */
  s: string;
  /**
   * Value
   */
  v: T;
  /**
   * CRDT type (null for regular values)
   */
  c: string | null;
}

export type MessageType =
  | "ping"
  | "pong"
  | "query"
  | "queryAck"
  | "subscribe"
  | "get"
  | "put"
  | "crdtPut"
  | "crdtGet"
  | "crdt"
  | "join"
  | "servers";

export interface BaseMessage {
  type: MessageType;
  /**
   * Unique random id for the message, to ack back
   */
  id: string;
  /**
   * Who was this message sent to already
   */
  to: string[];
}

export interface JoinMessage extends BaseMessage {
  type: "join";
  peer: Peer;
}

export interface ServersMessage extends BaseMessage {
  type: "servers";
  servers: Peer[];
}

export interface PingMessage extends BaseMessage {
  type: "ping";
  isServer: boolean;
  clientId: string;
}

export interface PongMessage extends BaseMessage {
  type: "pong";
  isServer: boolean;
  clientId: string;
}

export interface QueryMessage extends BaseMessage {
  type: "query";
  key: string; // key we want to get
}

export interface QueryAckMessage extends BaseMessage {
  type: "queryAck";
  keys: string[];
}

export interface SubscribeMessage extends BaseMessage {
  type: "subscribe";
  key: string;
}

export interface GetMessage extends BaseMessage {
  type: "get";
  key: string; // key we want to get
}

export interface PutMessage<T = any> extends BaseMessage {
  type: "put";
  data: VerificationData<T>;
}

export interface CrdtPutMessage<T = any> extends BaseMessage {
  type: "crdtPut";
  data: VerificationData<T>;
}

export interface CrdtGetMessage<T = any> extends BaseMessage {
  type: "crdtGet";
  key: string;
}

export type ToolDbMessage =
  | JoinMessage
  | ServersMessage
  | PingMessage
  | PongMessage
  | QueryMessage
  | QueryAckMessage
  | SubscribeMessage
  | GetMessage
  | PutMessage
  | CrdtPutMessage
  | CrdtGetMessage;
