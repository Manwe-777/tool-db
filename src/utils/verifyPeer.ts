import {
  hexToArrayBuffer,
  importKey,
  recoverPubKey,
  sha256,
  verifyData,
} from "..";
import { Peer } from "../types/tooldb";

export default async function verifyPeer(peer: Peer) {
  const data = sha256(
    `${peer.topic}-${peer.timestamp}-${peer.host}:${peer.port}`
  );

  const pubKey = await recoverPubKey(
    sha256(data),
    hexToArrayBuffer(peer.sig),
    peer.adress
  );

  // Import the public key string
  return importKey(hexToArrayBuffer(pubKey), "raw", "ECDSA", ["verify"]).then(
    (pubKey) => verifyData(data, hexToArrayBuffer(peer.sig), pubKey)
  );
}
