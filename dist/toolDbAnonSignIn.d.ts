import ToolDb from "./tooldb";
export default function toolDbAnonSignIn(this: ToolDb): Promise<{
    signKeys: CryptoKeyPair;
    encryptionKeys: CryptoKeyPair;
}>;
