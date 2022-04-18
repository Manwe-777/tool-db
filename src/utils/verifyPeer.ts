import sha256 from "./sha256";

import { Peer } from "../types/tooldb";

import Web3 from "web3";

export default function verifyPeer(web3: Web3, peer: Peer) {
  const data = sha256(
    `${peer.topic}-${peer.timestamp}-${peer.host}:${peer.port}`
  );

  const recoveredAddress = web3.eth.accounts.recover(data, peer.sig);

  const verified = recoveredAddress === peer.adress;
  return verified;
}
