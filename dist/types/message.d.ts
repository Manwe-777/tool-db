import { GraphEntryValue } from "./graph";
export declare type MessageType = "get-peersync" | "set-peersync" | "get" | "put";
export interface MessageBase {
    hash: string;
    type: MessageType;
}
export interface MessageGetPeerSync extends MessageBase {
    type: "get-peersync";
    source: string;
    namespace: string;
}
export interface MessageSetPeerSync extends MessageBase {
    type: "set-peersync";
    peers: string[];
}
export interface MessageGet extends MessageBase {
    type: "get";
    source: string;
    key: string;
}
export interface MessagePut extends MessageBase {
    type: "put";
    val: GraphEntryValue;
}
export declare type AnyMessage = MessageGetPeerSync | MessageSetPeerSync | MessageGet | MessagePut;
export declare enum VerifyResult {
    InvalidVerification = -6,
    InvalidTimestamp = -5,
    PubKeyMismatch = -4,
    NoProofOfWork = -3,
    InvalidHashNonce = -2,
    InvalidSignature = -1,
    Verified = 1
}
