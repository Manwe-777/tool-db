export interface ParsedKeys {
    skpub: string;
    skpriv: string;
    ekpub: string;
    ekpriv: string;
}
export declare type GenericObject = {
    [key: string]: any;
};
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
