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

  public signData(data: string, privateKey?: string) {
    return "";
  }

  public verifySignature(message: Partial<VerificationData<any>>) {
    return false;
  }

  public getAccountFromPrivate(privateKey: string): unknown {
    return undefined;
  }

  public encryptAccount(password: string): unknown {
    return undefined;
  }

  public decryptAccount(acc: unknown, password: string): any {
    return undefined;
  }

  public getAddress(): string | undefined {
    return "";
  }

  public getUsername(): string | undefined {
    return "";
  }
}
