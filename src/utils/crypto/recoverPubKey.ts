import { ec } from "elliptic";

import arrayBufferToHex from "../arrayBufferToHex";

const ecCurve =
  typeof window === "undefined"
    ? ((global as any).ecp256 as ec)
    : ((window as any).ecp256 as ec);

export default function recoverPubKey(
  origMessage: string,
  signature: ArrayBuffer
): [string, string] {
  // function hexToDec(hex: string) {
  //   return new BN(hex, 16);
  // }

  const hexToDecimal = (x: string) =>
    ecCurve.keyFromPrivate(x, "hex").getPrivate().toString(10);

  const msg = hexToDecimal(origMessage);

  const ecSig = {
    r: arrayBufferToHex(signature.slice(0, 32)),
    s: arrayBufferToHex(signature.slice(32, 64)),
  };

  const keyA = ecCurve.recoverPubKey(msg, ecSig, 0).encode("hex");
  const keyB = ecCurve.recoverPubKey(msg, ecSig, 1).encode("hex");
  return [keyA, keyB];
}
