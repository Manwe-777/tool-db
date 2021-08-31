import { KeyPair } from "./utils/crypto/generateKeyPair";
import ToolDbClient from "./toolDbClient";
export default function toolDbSignIn(this: ToolDbClient, user: string, password: string): Promise<{
    signKeys: KeyPair;
    encryptionKeys: KeyPair;
} | undefined>;
