import { ToolDb, VerificationData } from "..";

export default class ToolDbUserAdapter {
  private _tooldb: ToolDb;

  get tooldb() {
    return this._tooldb;
  }

  constructor(db: ToolDb) {
    this._tooldb = db;
  }

  public anonUser(): Promise<void> {
    return Promise.resolve();
  }

  public setUser(account: unknown | undefined, name: string): Promise<void> {
    return Promise.resolve();
  }

  public signData(data: string): Promise<string> {
    return Promise.resolve("");
  }

  public verifySignature(
    message: Partial<VerificationData<any>>
  ): Promise<boolean> {
    return Promise.resolve(false);
  }

  public getAccountFromPrivate(privateKey: string): Promise<unknown> {
    return Promise.resolve(undefined);
  }

  public encryptAccount(password: string): Promise<unknown> {
    return Promise.resolve(undefined);
  }

  public decryptAccount(acc: unknown, password: string): Promise<any> {
    return Promise.resolve(undefined);
  }

  public getAddress(): string | undefined {
    return "";
  }

  public getUsername(): string | undefined {
    return "";
  }
}
