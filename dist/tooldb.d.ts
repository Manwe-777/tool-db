import Deduplicator from "./deduplicator";
import WSS from "./wss";
import Automerge from "automerge";
import { ToolDbOptions } from "./types/tooldb";
import toolDbServerOnMessage from "./toolDbServerOnMessage";
import toolDbGet from "./toolDbGet";
import toolDbPut from "./toolDbPut";
import toolDbGetPubKey from "./toolDbGetPubKey";
import toolDbSignIn from "./toolDbSignIn";
import toolDbAnonSignIn from "./toolDbAnonSignIn";
import toolDbSignUp from "./toolDbSignUp";
import toolDbVerificationWrapper from "./toolDbVerificationWrapper";
import toolDbClientOnMessage from "./toolDbClientOnMessage";
import { VerificationData } from ".";
export interface Listener {
    key: string;
    timeout: number | null;
    fn: (msg: any) => void;
}
interface Verificator<T> {
    key: string;
    fn: (msg: VerificationData) => Promise<boolean>;
}
export default class ToolDb {
    private _deduplicator;
    private _websockets;
    private _store;
    private _documents;
    private _syncStates;
    serverOnMessage: typeof toolDbServerOnMessage;
    clientOnMessage: typeof toolDbClientOnMessage;
    getData: typeof toolDbGet;
    putData: typeof toolDbPut;
    getPubKey: typeof toolDbGetPubKey;
    signIn: typeof toolDbSignIn;
    anonSignIn: typeof toolDbAnonSignIn;
    signUp: typeof toolDbSignUp;
    verify: typeof toolDbVerificationWrapper;
    _keyListeners: (Listener | null)[];
    addKeyListener: <T = any>(key: string, fn: (msg: T) => void) => number;
    removeKeyListener: (id: number) => void;
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
    get documents(): Record<string, Automerge.FreezeObject<any>>;
    get syncStates(): Record<string, Record<string, Automerge.SyncState>>;
    constructor(options?: Partial<ToolDbOptions>);
}
export {};
