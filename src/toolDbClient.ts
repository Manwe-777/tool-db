import Gun from "gun";
import customGun from "./customGun";
import toolDbAnonSignIn from "./toolDbAnonSignIn";
import toolDbGet from "./toolDbGet";
import toolDbGetPubKey from "./toolDbGetPubKey";
import toolDbPut from "./toolDbPut";
import toolDbSignIn from "./toolDbSignIn";
import toolDbSignUp from "./toolDbSignUp";

class ToolDbClient {
  public debug = false;

  public host = "";

  private _gun;

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
          signKeys: CryptoKeyPair;
          encryptionKeys: CryptoKeyPair;
        };
        name: string;
        pubKey: string;
      };

  constructor(_host: string) {
    this.host = _host;
    customGun();

    this._gun = new Gun({
      peers: ["http://dev-gun.armsbook.com:8765/gun"],
    });
  }

  get gun() {
    return this._gun;
  }
}

export default ToolDbClient;
