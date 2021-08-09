import { KeyPair } from "./generateKeyPair";
export default function loadKeysComb(): Promise<{
    signKeys: KeyPair;
    encryptionKeys: KeyPair;
} | undefined>;
