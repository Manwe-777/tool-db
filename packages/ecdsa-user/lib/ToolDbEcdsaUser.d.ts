import { ToolDb, ToolDbUserAdapter, VerificationData } from "tool-db";
import { ECDSAUser, EncryptedUserdata } from "./types";
export default class ToolDbEcdsaUser extends ToolDbUserAdapter {
    private _address;
    private _username;
    private _keys;
    constructor(db: ToolDb);
    anonUser(): void;
    setUser(account: ECDSAUser, _name: string): void;
    signData(data: string): Promise<string>;
    getPublic(): Promise<string>;
    verifySignature(message: Partial<VerificationData<any>>): Promise<boolean>;
    encryptAccount(password: string): Promise<EncryptedUserdata>;
    decryptAccount(acc: EncryptedUserdata, password: string): Promise<ECDSAUser>;
    getAddress(): string | undefined;
    getUsername(): string | undefined;
}
