export default function generateKeysComb(): Promise<{
    signKeys: CryptoKeyPair;
    encryptionKeys: CryptoKeyPair;
}>;
