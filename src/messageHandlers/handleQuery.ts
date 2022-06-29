import { ToolDb } from "..";
import { QueryAckMessage, QueryMessage } from "../types/message";

export default function handleQuery(
  this: ToolDb,
  message: QueryMessage,
  remotePeerId: string
) {
  this.store
    .query(message.key)
    .then((keys) => {
      this.network.sendToClientId(remotePeerId, {
        type: "queryAck",
        id: message.id,
        to: [],
        keys,
      } as QueryAckMessage);
    })
    .catch((e) => {
      // do nothing
    });

  if (this.options.server) {
    this.network.sendToAll(message, true);
  }
}
