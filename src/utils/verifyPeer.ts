import {
  base64ToArrayBuffer,
  decodeKeyString,
  importKey,
  sha256,
  verifyData,
} from "..";
import { Peer } from "../types/tooldb";

export default function verifyPeer(peer: Peer) {
  // Import the public key string
  return importKey(decodeKeyString(peer.pubkey), "spki", "ECDSA", [
    "verify",
  ]).then((pubKey) =>
    verifyData(
      sha256(`${peer.topic}-${peer.timestamp}-${peer.host}:${peer.port}`),
      base64ToArrayBuffer(peer.sig),
      pubKey,
      "SHA-1"
    )
  );
}
