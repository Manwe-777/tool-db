import { KeyPair } from "./generateKeyPair";
export default function deriveSecret(keys: KeyPair): PromiseLike<CryptoKey>;
