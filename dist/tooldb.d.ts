import Deduplicator from "./deduplicator";
import WSS from "./wss";
import { ToolDbOptions } from "./types/tooldb";
import toolDbGet from "./toolDbGet";
import toolDbPut from "./toolDbPut";
import toolDbGetPubKey from "./toolDbGetPubKey";
import toolDbSignIn from "./toolDbSignIn";
import toolDbAnonSignIn from "./toolDbAnonSignIn";
import toolDbSignUp from "./toolDbSignUp";
import toolDbVerificationWrapper from "./toolDbVerificationWrapper";
import toolDbClientOnMessage from "./toolDbClientOnMessage";
import { PutMessage, ToolDbMessage, VerificationData } from ".";
import toolDbSubscribe from "./toolDbSubscribe";
export interface Listener {
    key: string;
    timeout: number | null;
    fn: (msg: any) => void;
}
interface Verificator<T> {
    key: string;
    fn: (msg: VerificationData<T>) => Promise<boolean>;
}
export default class ToolDb {
    private _deduplicator;
    private _websockets;
    private _store;
    clientOnMessage: typeof toolDbClientOnMessage;
    subscribeData: typeof toolDbSubscribe;
    getData: typeof toolDbGet;
    putData: typeof toolDbPut;
    getPubKey: typeof toolDbGetPubKey;
    signIn: typeof toolDbSignIn;
    anonSignIn: typeof toolDbAnonSignIn;
    signUp: typeof toolDbSignUp;
    verify: typeof toolDbVerificationWrapper;
    /**
     * id listeners listen for a specific message ID just once
     */
    _idListeners: Record<string, (msg: ToolDbMessage) => void>;
    addIdListener: (id: string, fn: (msg: ToolDbMessage) => void) => void;
    removeIdListener: (id: string) => void;
    /**
     * Key listeners listen for a specific key, as long as the listener remains active
     */
    _keyListeners: (Listener | null)[];
    addKeyListener: <T>(key: string, fn: (msg: PutMessage<T>) => void) => number;
    removeKeyListener: (id: number) => void;
    /**
     * Custom verificators can enhance default verification on any key field
     */
    _customVerificator: (Verificator<any> | null)[];
    addCustomVerification: <T = any>(key: string, fn: (msg: VerificationData) => Promise<boolean>) => number;
    removeCustomVerification: (id: number) => void;
    user: {
        keys: {
            signKeys: CryptoKeyPair;
            encryptionKeys: CryptoKeyPair;
        };
        name: string;
        pubKey: string;
    } | undefined;
    private _options;
    get options(): ToolDbOptions;
    get deduplicator(): Deduplicator;
    get websockets(): WSS;
    get store(): {
        start: () => void;
        put: (key: string, data: any, cb: (err: any, data?: any) => void) => void;
        get: (key: string, cb: (err: any, data?: any) => void) => void;
    };
    constructor(options?: Partial<ToolDbOptions>);
}
export {};
