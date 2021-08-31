import toolDbAnonSignIn from "./toolDbAnonSignIn";
import toolDbGet from "./toolDbGet";
import toolDbGetPubKey from "./toolDbGetPubKey";
import toolDbPut from "./toolDbPut";
import toolDbSignIn from "./toolDbSignIn";
import toolDbSignUp from "./toolDbSignUp";
import { KeyPair } from "./utils/crypto/generateKeyPair";

class ToolDbClient {
  private debug = false;

  private _host = "";

  public getData = toolDbGet;

  public putData = toolDbPut;

  public getPubKey = toolDbGetPubKey;

  public signIn = toolDbSignIn;

  public anonSignIn = toolDbAnonSignIn;

  public signUp = toolDbSignUp;

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

export default ToolDbClient;
