import ToolDb from "./tooldb";
import { JoinMessage } from "./types/message";
import { Peer } from "./types/tooldb";
import getPeerSignature from "./utils/getPeerSignature";
import textRandom from "./utils/textRandom";

export default function sendJoin(this: ToolDb, remotePeerId: string) {
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
      address: this.peerAccount.getAddress() || "",
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
