import sha256 from "./sha256";
import importKey from "./crypto/importKey";
import verifyData from "./crypto/verifyData";
import hexToArrayBuffer from "./encoding/hexToArrayBuffer";

import { Peer } from "../types/tooldb";

export default async function verifyPeer(peer: Peer) {
  const data = sha256(
    `${peer.topic}-${peer.timestamp}-${peer.host}:${peer.port}`
  );

  // Import the public key string
  return importKey(hexToArrayBuffer(peer.adress), "raw", "ECDSA", [
    "verify",
  ]).then((pubKey) => verifyData(data, hexToArrayBuffer(peer.sig), pubKey));
}
