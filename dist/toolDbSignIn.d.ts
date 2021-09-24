import ToolDb from "./tooldb";
export default function toolDbSignIn(this: ToolDb, user: string, password: string): Promise<{
    signKeys: CryptoKeyPair;
    encryptionKeys: CryptoKeyPair;
} | undefined>;
