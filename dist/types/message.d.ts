export declare enum VerifyResult {
    CustomVerificationFailed = -8,
    InvalidData = -7,
    InvalidVerification = -6,
    InvalidTimestamp = -5,
    PubKeyMismatch = -4,
    NoProofOfWork = -3,
    InvalidHashNonce = -2,
    InvalidSignature = -1,
    Verified = 1
}
export interface VerificationData<T = any> {
    key: string;
    pub: string;
    non: number;
    hash: string;
    time: number;
    sig: string;
    val: T;
}
export declare type MessageType = "query" | "queryAck" | "get" | "put";
export interface BaseMessage {
    type: MessageType;
    id: string;
}
export interface QueryMessage extends BaseMessage {
    type: "query";
    key: string;
    to: string[];
}
export interface QueryAckMessage extends BaseMessage {
    type: "queryAck";
    keys: string[];
}
export interface GetMessage extends BaseMessage {
    type: "get";
    key: string;
    to: string[];
}
export interface PutMessage extends BaseMessage, VerificationData {
    type: "put";
}
export declare type ToolDbMessage = QueryMessage | QueryAckMessage | GetMessage | PutMessage;
