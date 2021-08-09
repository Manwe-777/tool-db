import sha256 from "./sha256";

export default function calculateValueHash(
  value: string,
  revision: number,
  nonce: number
) {
  // const time = new Date().getTime();
  return sha256(`${value}${nonce}${revision}`);
}
