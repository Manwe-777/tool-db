import { IGunChainReference } from "gun/types/chain";
import { GraphEntryValue } from ".";

import customGun from "./customGun";
import shared from "./shared";
import toolDbAnonSignIn from "./toolDbAnonSignIn";
import toolDbGet from "./toolDbGet";
import toolDbGetPubKey from "./toolDbGetPubKey";
import toolDbPut from "./toolDbPut";
import toolDbSignIn from "./toolDbSignIn";
import toolDbSignUp from "./toolDbSignUp";
import toolDbVerificationWrapper from "./toolDbVerificationWrapper";

const Gun = require("gun");

interface Listener {
  key: string;
  timeout: number | null;
  fn: (msg: any) => void;
}

interface Verificator<T> {
  key: string;
  fn: (msg: GraphEntryValue<T>) => Promise<boolean>;
}

class ToolDbClient {
  public debug = false;

  private _gun: IGunChainReference<any>;

  public getData = toolDbGet;

  public putData = toolDbPut;

  public getPubKey = toolDbGetPubKey;

  public signIn = toolDbSignIn;

  public anonSignIn = toolDbAnonSignIn;

  public signUp = toolDbSignUp;

  public verify = toolDbVerificationWrapper;

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

  public _customVerificator: (Verificator<any> | null)[] = [];

  public addCustomVerification = <T = any>(
    key: string,
    fn: (msg: GraphEntryValue<T>) => Promise<boolean>
  ) => {
    const newListener: Verificator<T> = {
      key,
      fn,
    };

    this._customVerificator.push(newListener);
    return this._customVerificator.length;
  };

  public removeCustomVerification = (id: number) => {
    this._customVerificator[id] = null;
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
    shared.toolDb = this;
    shared.gun = Gun;
    customGun(this, Gun);

    this._gun = new Gun({
      peers,
    });
  }

  get gun() {
    return this._gun;
  }
}

export default ToolDbClient;
