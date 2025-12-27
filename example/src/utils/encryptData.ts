import ethCrypto from "eth-crypto";

export default async function encryptData(
  data: string,
  publicKey: string
): Promise<string> {
  const encrypted = await ethCrypto.encryptWithPublicKey(publicKey, data);
  return ethCrypto.cipher.stringify(encrypted);
}
