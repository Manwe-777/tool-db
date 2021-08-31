import ToolDbClient from "./toolDbClient";
export default function toolDbSignIn(this: ToolDbClient, user: string, password: string): Promise<{
    signKeys: CryptoKeyPair;
    encryptionKeys: CryptoKeyPair;
} | undefined>;
