import { EncryptedKeystoreV3Json, Account } from "web3-core";
import w3 from "web3";

import {
  ToolDb,
  VerificationData,
  ToolDbUserAdapter,
  randomAnimal,
} from "tool-db";

export default class ToolDbWeb3User extends ToolDbUserAdapter {
  public web3: w3;

  private _user: Account;
  private _userName: string;

  constructor(db: ToolDb) {
    super(db);
    this.web3 = new w3(w3.givenProvider);
    this._user = this.web3.eth.accounts.create();
    this._userName = randomAnimal();
  }

  public anonUser() {
    this._user = this.web3.eth.accounts.create();
    this._userName = randomAnimal();
  }

  public setUser(account: Account, name: string): Promise<void> {
    this._user = account;
    this._userName = name;
    return Promise.resolve();
  }

  public signData(data: string) {
    const signature = this.web3.eth.accounts.sign(data, this._user.privateKey);

    return Promise.resolve(signature.signature);
  }

  public verifySignature(message: Partial<VerificationData<any>>) {
    if (!message.h || !message.s) return Promise.resolve(false);

    const address = this.web3.eth.accounts.recover(message.h, message.s);
    return Promise.resolve(address === message.a);
  }

  public getAccountFromPrivate(privateKey: string) {
    return Promise.resolve(
      this.web3.eth.accounts.privateKeyToAccount(privateKey)
    );
  }

  public encryptAccount(password: string) {
    return Promise.resolve(this._user.encrypt(password));
  }

  public decryptAccount(acc: EncryptedKeystoreV3Json, password: string) {
    try {
      const newAccount = this.web3.eth.accounts.decrypt(acc, password);
      return Promise.resolve(newAccount);
    } catch (e) {
      throw e;
    }
  }

  public getAddress(): string {
    return this._user.address;
  }

  public getUsername(): string {
    return this._userName;
  }
}
