import sha256 from "./sha256";

import { Peer } from "../types/tooldb";

import ToolDb from "../tooldb";

export default function verifyPeer(tooldb: ToolDb, peer: Peer) {
  const data = sha256(
    `${peer.topic}-${peer.timestamp}-${peer.host}:${peer.port}`
  );

  // its not really a message but this function works with a Partial
  // I want to keep it like this so the signature verification is in a single place
  return tooldb.verifyMessage({
    h: data,
    a: peer.address,
    s: peer.sig,
  });
}
