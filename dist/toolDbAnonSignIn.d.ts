import ToolDbClient from "./toolDbClient";
export default function toolDbAnonSignIn(this: ToolDbClient): Promise<{
    signKeys: CryptoKeyPair;
    encryptionKeys: CryptoKeyPair;
}>;
