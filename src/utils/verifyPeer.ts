import { decodeKeyString, fromBase64, importKey, sha256, verifyData } from "..";
import { Peer } from "../types/tooldb";

export default function verifyPeer(peer: Peer) {
  // Import the public key string
  return importKey(decodeKeyString(peer.pubkey), "spki", "ECDSA", [
    "verify",
  ]).then((pubKey) =>
    verifyData(
      sha256(`${peer.topic}-${peer.timestamp}-${peer.host}:${peer.port}`),
      fromBase64(peer.sig),
      pubKey,
      "SHA-1"
    )
  );
}
