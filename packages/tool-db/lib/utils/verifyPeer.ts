import { ToolDb, sha256, Peer } from "..";

export default function verifyPeer(tooldb: ToolDb, peer: Peer) {
  const data = sha256(
    `${peer.topic}-${peer.timestamp}-${peer.host}:${peer.port}`
  );

  // Peers are not messages, so we only check the signature of the peer data
  return tooldb.userAccount.verifySignature({
    h: data,
    a: peer.address,
    s: peer.sig,
  });
}
