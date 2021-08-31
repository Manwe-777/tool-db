export default function importKey(key: ArrayBuffer, type: any, algorithm: "ECDSA" | "ECDH", ops: KeyUsage[]): Promise<CryptoKey>;
