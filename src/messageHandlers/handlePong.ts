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
  this.onConnect(this.options.id);

  if (this.options.server && this.options.privateKey) {
    const timestamp = new Date().getTime();

    getPeerSignature(
      this.options.privateKey,
      this.options.topic,
      timestamp,
      this.options.host,
      this.options.port
    ).then((signature) => {
      const meAsPeer: Peer = {
        topic: this.options.topic,
        timestamp: timestamp,
        host: this.options.host,
        port: this.options.port,
        adress: this.options.id,
        sig: signature,
      };

      this.network.sendToClientId(remotePeerId, {
        type: "join",
        peer: meAsPeer,
        to: [],
        id: textRandom(10),
      } as JoinMessage);
    });
  }
}
