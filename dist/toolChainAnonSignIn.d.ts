import ToolChain from ".";
import { KeyPair } from "./utils/crypto/generateKeyPair";
export default function toolChainAnonSignIn(this: ToolChain): Promise<{
    signKeys: KeyPair;
    encryptionKeys: KeyPair;
}>;
