import {
  AllowedFunctionArguments,
  AllowedFunctionReturn,
  FunctionCodes,
  Peer,
} from "..";

export enum VerifyResult {
  CustomVerificationFailed = "CustomVerificationFailed",
  InvalidData = "InvalidData",
  InvalidVerification = "InvalidVerification",
  CantOverwrite = "CantOverwrite",
  InvalidTimestamp = "InvalidTimestamp",
  AddressMismatch = "AddressMismatch",
  InvalidHash = "InvalidHash",
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
   * Nonce, always 0 (legacy proof of work field, kept for compatibility)
   */
  n: number;
  /**
   * Hash of JSON.stringify(value) + address + timestamp + nonce
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
  | "function"
  | "functionReturn"
  | "subscribe"
  | "get"
  | "put"
  | "crdtPut"
  | "crdtGet"
  | "crdt";

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

export interface PingMessage extends BaseMessage {
  type: "ping";
  isServer: boolean;
  clientId: string;
  peer: Peer;
}

export interface PongMessage extends BaseMessage {
  type: "pong";
  isServer: boolean;
  clientId: string;
  servers: Peer[];
}

export interface QueryMessage extends BaseMessage {
  type: "query";
  key: string; // key we want to get
}

export interface QueryAckMessage extends BaseMessage {
  type: "queryAck";
  keys: string[];
}

export interface FunctionMessage extends BaseMessage {
  type: "function";
  function: string;
  args: AllowedFunctionArguments<any>;
}

export interface FunctionReturnMessage extends BaseMessage {
  type: "functionReturn";
  code: FunctionCodes;
  return: AllowedFunctionReturn<any>;
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

/**
 * A set of CRDT changes made and signed by a single author.
 */
export interface SignedChangeSet<C = any> {
  /**
   * Author address, every change in the set must be authored by it
   */
  a: string;
  /**
   * Timestamp this set was created
   */
  t: number;
  /**
   * Changes
   */
  c: C[];
  /**
   * Signature of getChangeSetHash
   */
  s: string;
}

/**
 * A CRDT document, as stored and sent over the network.
 * There is no document level signature, every change set is verified on its own.
 */
export interface CrdtData<C = any> {
  /**
   * Key/id
   */
  k: string;
  /**
   * CRDT type
   */
  c: string;
  /**
   * Hash of all the change sets, used for deduplication only
   */
  h: string;
  /**
   * Signed change sets
   */
  sets: SignedChangeSet<C>[];
}

/**
 * A CRDT document as given to listeners and events, with all the changes
 * of its change sets in `v`.
 */
export interface CrdtView<C = any> extends CrdtData<C> {
  v: C[];
}

export interface CrdtPutMessage<C = any> extends BaseMessage {
  type: "crdtPut";
  data: CrdtData<C>;
}

export interface CrdtGetMessage<T = any> extends BaseMessage {
  type: "crdtGet";
  key: string;
}

export type ToolDbMessage =
  | PingMessage
  | PongMessage
  | QueryMessage
  | QueryAckMessage
  | FunctionMessage
  | FunctionReturnMessage
  | SubscribeMessage
  | GetMessage
  | PutMessage
  | CrdtPutMessage
  | CrdtGetMessage;
