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
import { ToolDbEntryValue } from ".";
import toolDbClientOnMessage from "./toolDbClientOnMessage";
export interface Listener {
    key: string;
    timeout: number | null;
    fn: (msg: any) => void;
}
interface Verificator<T> {
    key: string;
    fn: (msg: ToolDbEntryValue<T>) => Promise<boolean>;
}
export default class ToolDb {
    private _deduplicator;
    private _websockets;
    private _documents;
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
    addCustomVerification: <T = any>(key: string, fn: (msg: ToolDbEntryValue<T>) => Promise<boolean>) => number;
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
    get documents(): Record<string, Automerge.FreezeObject<any>>;
    constructor(options?: Partial<ToolDbOptions>);
}
export {};
