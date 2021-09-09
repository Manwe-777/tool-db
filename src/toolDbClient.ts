import Gun from "gun";

import customGun from "./customGun";
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

class ToolDbClient {
  public debug = false;

  private _gun;

  public getData = toolDbGet;

  public putData = toolDbPut;

  public getPubKey = toolDbGetPubKey;

  public signIn = toolDbSignIn;

  public anonSignIn = toolDbAnonSignIn;

  public signUp = toolDbSignUp;

  public _keyListeners: (Listener | null)[] = [];

  public addKeyListener = <T = any>(key: string, fn: (msg: T) => void) => {
    const newListener: Listener = {
      key,
      timeout: null,
      fn,
    };

    this._keyListeners.push(newListener);
    return this._keyListeners.length;
  };

  public removeKeyListener = (id: number) => {
    if (this._keyListeners[id]?.timeout) {
      clearTimeout(this._keyListeners[id]?.timeout || undefined);
    }
    this._keyListeners[id] = null;
  };

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

  constructor(peers: string[]) {
    customGun(this, Gun);

    if (typeof window !== "undefined") (window as any).toolDb = this;
    if (typeof global !== "undefined") (global as any).toolDb = this;

    this._gun = new Gun({
      peers,
    });
  }

  get gun() {
    return this._gun;
  }
}

export default ToolDbClient;
