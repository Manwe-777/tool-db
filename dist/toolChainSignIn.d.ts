import { KeyPair } from "./utils/crypto/generateKeyPair";
import ToolChainClient from "./toolChainClient";
export default function toolChainSignIn(this: ToolChainClient, user: string, password: string): Promise<{
    signKeys: KeyPair;
    encryptionKeys: KeyPair;
} | undefined>;
