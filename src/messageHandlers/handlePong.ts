import { ToolDb } from "..";
import { Peer } from "../types/tooldb";
import getPeerSignature from "../utils/getPeerSignature";
import { JoinMessage, PongMessage } from "../types/message";
import textRandom from "../utils/textRandom";

export default function handlePong(
  this: ToolDb,
  message: PongMessage,
  remotePeerId: string
) {
  if (!this.isConnected) {
    this.isConnected = true;
    this.onConnect();
  }
  this.onPeerConnect(this.peerAccount.getAddress() || "");

  if (this.options.server && this.peerAccount.getAddress()) {
    const timestamp = new Date().getTime();

    const signature = getPeerSignature(
      this.peerAccount,
      this.options.topic,
      timestamp,
      this.options.host,
      this.options.port
    );

    const meAsPeer: Peer = {
      topic: this.options.topic,
      timestamp: timestamp,
      host: this.options.host,
      port: this.options.port,
      adress: this.peerAccount.getAddress() || "",
      sig: signature,
    };

    this.network.sendToClientId(remotePeerId, {
      type: "join",
      peer: meAsPeer,
      to: [],
      id: textRandom(10),
    } as JoinMessage);
  }
}
