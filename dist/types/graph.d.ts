import ToolChain from "..";
export interface ParsedKeys {
    skpub: string;
    skpriv: string;
    ekpub: string;
    ekpriv: string;
}
export interface ToolChainOptions {
    serveMessages?: boolean;
    relayMessages?: boolean;
    maxPeers?: number;
    reconnectTimeout?: number;
    host?: string;
    port?: number;
    path?: string;
}
export declare type GenericObject = {
    [key: string]: any;
};
export interface GraphEntryValue<T = any> {
    key: string;
    pub: string;
    hash: string;
    sig: string;
    timestamp: number;
    nonce: number;
    value: T;
}
export declare type GraphBase = Record<string, GraphEntryValue>;
export interface UserRootData {
    keys: {
        skpub: string;
        skpriv: string;
        ekpub: string;
        ekpriv: string;
    };
    iv: string;
    pass: string;
}
declare global {
    interface Window {
        toolchain: ToolChain | undefined;
        chainData: any;
    }
}
