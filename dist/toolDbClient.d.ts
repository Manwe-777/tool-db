import { GraphEntryValue } from ".";
import toolDbAnonSignIn from "./toolDbAnonSignIn";
import toolDbGet from "./toolDbGet";
import toolDbGetPubKey from "./toolDbGetPubKey";
import toolDbPut from "./toolDbPut";
import toolDbSignIn from "./toolDbSignIn";
import toolDbSignUp from "./toolDbSignUp";
import toolDbVerificationWrapper from "./toolDbVerificationWrapper";
interface Listener {
    key: string;
    timeout: number | null;
    fn: (msg: any) => void;
}
interface Verificator<T> {
    key: string;
    fn: (msg: GraphEntryValue<T>) => Promise<boolean>;
}
declare class ToolDbClient {
    debug: boolean;
    private _gun;
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
    addCustomVerification: <T = any>(key: string, fn: (msg: GraphEntryValue<T>) => Promise<boolean>) => number;
    removeCustomVerification: (id: number) => void;
    user: {
        keys: {
            signKeys: CryptoKeyPair;
            encryptionKeys: CryptoKeyPair;
        };
        name: string;
        pubKey: string;
    } | undefined;
    constructor(peers?: string[], gunRef?: any);
    get gun(): any;
    get requiredGun(): any;
}
export default ToolDbClient;
