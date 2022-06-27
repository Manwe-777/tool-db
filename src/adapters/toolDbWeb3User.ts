import w3 from "web3";

import { EncryptedKeystoreV3Json, Account } from "web3-core";
import ToolDbUserAdapter from "../adapters-base/userAdapter";

import ToolDb from "../tooldb";
import { VerificationData } from "../types/message";

import randomAnimal from "../utils/randomAnimal";

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

  public setUser(account: Account, name: string): void {
    this._user = account;
    this._userName = name;
  }

  public signData(data: string) {
    const signature = this.web3.eth.accounts.sign(data, this._user.privateKey);

    return signature.signature;
  }

  public verifySignature(message: Partial<VerificationData<any>>) {
    if (!message.h || !message.s) return false;

    const address = this.web3.eth.accounts.recover(message.h, message.s);
    return address === message.a;
  }

  public getAccountFromPrivate(privateKey: string) {
    return this.web3.eth.accounts.privateKeyToAccount(privateKey);
  }

  public encryptAccount(password: string) {
    return this._user.encrypt(password);
  }

  public decryptAccount(acc: EncryptedKeystoreV3Json, password: string) {
    try {
      const newAccount = this.web3.eth.accounts.decrypt(acc, password);
      return newAccount;
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
