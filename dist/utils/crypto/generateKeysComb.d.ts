import { KeyPair } from "./generateKeyPair";
export default function generateKeysComb(): Promise<{
    signKeys: KeyPair;
    encryptionKeys: KeyPair;
}>;
