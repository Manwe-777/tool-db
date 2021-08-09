export interface KeyPair {
    publicKey: CryptoKey;
    privateKey: CryptoKey;
}
export default function generateKeyPair(mode: "ECDSA" | "ECDH", extractable?: boolean): Promise<KeyPair>;
