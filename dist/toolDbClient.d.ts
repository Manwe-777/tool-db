import toolDbAnonSignIn from "./toolDbAnonSignIn";
import toolDbGet from "./toolDbGet";
import toolDbGetPubKey from "./toolDbGetPubKey";
import toolDbPut from "./toolDbPut";
import toolDbSignIn from "./toolDbSignIn";
import toolDbSignUp from "./toolDbSignUp";
import { KeyPair } from "./utils/crypto/generateKeyPair";
declare class ToolDbClient {
    private debug;
    private _host;
    getData: typeof toolDbGet;
    putData: typeof toolDbPut;
    getPubKey: typeof toolDbGetPubKey;
    signIn: typeof toolDbSignIn;
    anonSignIn: typeof toolDbAnonSignIn;
    signUp: typeof toolDbSignUp;
    user: {
        keys: {
            signKeys: KeyPair;
            encryptionKeys: KeyPair;
        };
        name: string;
        pubKey: string;
    } | undefined;
    constructor(host: string, debug?: boolean);
    get host(): string;
}
export default ToolDbClient;
