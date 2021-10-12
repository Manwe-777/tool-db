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
    k: string;
    p: string;
    n: number;
    h: string;
    t: number;
    s: string;
    v: T;
}
export declare type MessageType = "ping" | "pong" | "query" | "queryAck" | "subscribe" | "get" | "put" | "crdtPut";
export interface BaseMessage {
    type: MessageType;
    id: string;
}
export interface PingMessage extends BaseMessage {
    type: "ping";
}
export interface PongMessage extends BaseMessage {
    type: "pong";
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
export interface SubscribeMessage extends BaseMessage {
    type: "subscribe";
    key: string;
}
export interface GetMessage extends BaseMessage {
    type: "get";
    key: string;
    to: string[];
}
export interface PutMessage<T = any> extends BaseMessage, VerificationData<T> {
    type: "put";
}
export declare type ToolDbMessage = PingMessage | PongMessage | QueryMessage | QueryAckMessage | SubscribeMessage | GetMessage | PutMessage;
