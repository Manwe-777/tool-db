export default function loadKeysComb(): Promise<{
    signKeys: CryptoKeyPair;
    encryptionKeys: CryptoKeyPair;
} | undefined>;
