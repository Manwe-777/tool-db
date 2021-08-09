import { KeyPair } from "./utils/crypto/generateKeyPair";
import ToolChain from ".";
export default function toolChainSignIn(this: ToolChain, user: string, password: string): Promise<{
    signKeys: KeyPair;
    encryptionKeys: KeyPair;
} | undefined>;
