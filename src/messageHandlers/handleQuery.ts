import { ToolDb, QueryAckMessage, QueryMessage } from "..";

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
