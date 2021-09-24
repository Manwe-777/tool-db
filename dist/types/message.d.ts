import { ToolDbEntryValue } from "./graph";
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
export declare type MessageType = "get" | "put";
export interface BaseMessage {
    type: MessageType;
    id: string;
}
export interface GetMessage extends BaseMessage {
    type: "get";
    key: string;
    to: string[];
}
export interface PutMessage extends BaseMessage {
    type: "put";
    value: ToolDbEntryValue;
}
export declare type ToolDbMessage = GetMessage | PutMessage;
