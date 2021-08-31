import toolChainAnonSignIn from "./toolChainAnonSignIn";
import toolChainGet from "./toolChainGet";
import toolChainGetPubKey from "./toolChainGetPubKey";
import toolChainPut from "./toolChainPut";
import toolChainSignIn from "./toolChainSignIn";
import toolChainSignUp from "./toolChainSignUp";
import { KeyPair } from "./utils/crypto/generateKeyPair";
declare class ToolChainClient {
    private debug;
    private _host;
    getData: typeof toolChainGet;
    putData: typeof toolChainPut;
    getPubKey: typeof toolChainGetPubKey;
    signIn: typeof toolChainSignIn;
    anonSignIn: typeof toolChainAnonSignIn;
    signUp: typeof toolChainSignUp;
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
export default ToolChainClient;
