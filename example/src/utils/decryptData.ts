import ethCrypto from "eth-crypto";

export default async function decryptData(
  privateKey: string,
  cipheredData: string
): Promise<string> {
  const data = ethCrypto.cipher.parse(cipheredData);
  const ret = await ethCrypto.decryptWithPrivateKey(privateKey, data);
  return ret;
}
