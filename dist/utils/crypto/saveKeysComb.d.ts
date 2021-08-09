import { ParsedKeys } from "../../types/graph";
import { KeyPair } from "./generateKeyPair";
export default function saveKeysComb(signKeys: KeyPair, encryptionKeys: KeyPair): Promise<ParsedKeys>;
