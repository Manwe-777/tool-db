import ToolDbClient from "./toolDbClient";
import { KeyPair } from "./utils/crypto/generateKeyPair";
export default function toolDbAnonSignIn(this: ToolDbClient): Promise<{
    signKeys: KeyPair;
    encryptionKeys: KeyPair;
}>;
