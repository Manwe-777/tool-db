import ToolChainClient from "./toolChainClient";
import { KeyPair } from "./utils/crypto/generateKeyPair";
export default function toolChainAnonSignIn(this: ToolChainClient): Promise<{
    signKeys: KeyPair;
    encryptionKeys: KeyPair;
}>;
