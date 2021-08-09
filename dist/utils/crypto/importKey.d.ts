export default function importKey(key: ArrayBuffer, type: "pkcs8" | "spki" | "jwk", algorithm: "ECDSA" | "ECDH", ops: KeyUsage[]): Promise<CryptoKey>;
