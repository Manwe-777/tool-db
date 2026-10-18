import { ToolDb, VerificationData, EventTemplate, NostrEvent } from "..";

export default class ToolDbUserAdapter {
  private _tooldb: ToolDb;

  get tooldb() {
    return this._tooldb;
  }

  constructor(db: ToolDb) {
    this._tooldb = db;
  }

  public async anonUser(): Promise<void> {
    return;
  }

  public async setUser(
    account: unknown | undefined,
    name: string
  ): Promise<void> {}

  public signData(data: string): Promise<string> {
    return Promise.resolve("");
  }

  /**
   * Signs a Nostr event with this account.
   */
  public signEvent(event: EventTemplate): Promise<NostrEvent> {
    return Promise.reject(
      new Error("This user adapter can not sign Nostr events")
    );
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
