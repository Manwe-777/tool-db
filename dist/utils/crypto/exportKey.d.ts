export default function exportKey(format: "jwk" | "spki" | "pkcs8", key: CryptoKey): Promise<ArrayBuffer | JsonWebKey>;
