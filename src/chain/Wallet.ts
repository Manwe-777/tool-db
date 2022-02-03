import { exportKeyAsHex, generateKeysComb } from "..";

export default class Wallet {
  private _balance = 0;

  private _keyPair: CryptoKeyPair | undefined;

  private _publicKey = "";

  constructor() {
    //
  }

  generateKeys() {
    return new Promise<void>((resolve) => {
      generateKeysComb().then((keys) => {
        this._keyPair = keys.signKeys;
        if (this._keyPair.publicKey) {
          exportKeyAsHex(this._keyPair.publicKey).then((pub) => {
            this._publicKey = pub;
            resolve();
          });
        }
      });
    });
  }

  get keyPair() {
    return this._keyPair;
  }

  toString() {
    return `Wallet - 
        publicKey: ${this._publicKey.toString()}
        balance  : ${this._balance}`;
  }
}
