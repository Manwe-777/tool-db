import { GraphEntryValue } from "./graph";
export declare type MessageType = "get" | "put";
export interface MessageBase {
    hash: string;
    type: MessageType;
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
export declare type AnyMessage = MessageGet | MessagePut;
