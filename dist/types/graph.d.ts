export interface ParsedKeys {
    skpub: string;
    skpriv: string;
    ekpub: string;
    ekpriv: string;
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
