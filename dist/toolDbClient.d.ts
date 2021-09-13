import { IGunChainReference } from "gun/types/chain";
import toolDbAnonSignIn from "./toolDbAnonSignIn";
import toolDbGet from "./toolDbGet";
import toolDbGetPubKey from "./toolDbGetPubKey";
import toolDbPut from "./toolDbPut";
import toolDbSignIn from "./toolDbSignIn";
import toolDbSignUp from "./toolDbSignUp";
interface Listener {
    key: string;
    timeout: number | null;
    fn: (msg: any) => void;
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
    _keyListeners: (Listener | null)[];
    addKeyListener: <T = any>(key: string, fn: (msg: T) => void) => number;
    removeKeyListener: (id: number) => void;
    user: {
        keys: {
            signKeys: CryptoKeyPair;
            encryptionKeys: CryptoKeyPair;
        };
        name: string;
        pubKey: string;
    } | undefined;
    constructor(peers: string[]);
    get gun(): IGunChainReference<any, any, false>;
}
export default ToolDbClient;
