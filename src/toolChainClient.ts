import toolChainAnonSignIn from "./toolChainAnonSignIn";
import toolChainGet from "./toolChainGet";
import toolChainGetPubKey from "./toolChainGetPubKey";
import toolChainPut from "./toolChainPut";
import toolChainSignIn from "./toolChainSignIn";
import toolChainSignUp from "./toolChainSignUp";
import { KeyPair } from "./utils/crypto/generateKeyPair";

class ToolChainClient {
  private debug = false;

  private _host = "";

  public getData = toolChainGet;

  public putData = toolChainPut;

  public getPubKey = toolChainGetPubKey;

  public signIn = toolChainSignIn;

  public anonSignIn = toolChainAnonSignIn;

  public signUp = toolChainSignUp;

  public user = undefined as
    | undefined
    | {
        keys: {
          signKeys: KeyPair;
          encryptionKeys: KeyPair;
        };
        name: string;
        pubKey: string;
      };

  constructor(host: string, debug = false) {
    this._host = host;
    this.debug = debug;
  }

  get host(): string {
    return this._host;
  }
}

export default ToolChainClient;
