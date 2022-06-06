import sha256 from "./sha256";

import { Peer } from "../types/tooldb";

import ToolDb from "../tooldb";

export default function verifyPeer(tooldb: ToolDb, peer: Peer) {
  const data = sha256(
    `${peer.topic}-${peer.timestamp}-${peer.host}:${peer.port}`
  );

  const recoveredAddress = tooldb.recoverAddress(data, peer.sig); // web3.eth.accounts.recover(data, peer.sig);

  const verified = recoveredAddress === peer.adress;
  return verified;
}
