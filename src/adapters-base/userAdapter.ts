import ToolDb from "../tooldb";
import { VerificationData } from "../types/message";

export default class ToolDbUserAdapter {
  constructor(db: ToolDb) {
    //
  }

  public anonUser() {
    return;
  }

  public setUser(account: unknown | undefined, name: string): void {}

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
