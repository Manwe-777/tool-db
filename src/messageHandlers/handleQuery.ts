import { QueryAckMessage, QueryMessage, ToolDb } from "..";

export default function handleQuery(
  this: ToolDb,
  message: QueryMessage,
  remotePeerId: string
) {
  this.store.query(message.key).then((keys) => {
    this.network.sendToClientId(remotePeerId, {
      type: "queryAck",
      id: message.id,
      to: [],
      keys,
    } as QueryAckMessage);
  });

  if (this.options.server) {
    this.network.sendToAll(message, true, true);
  }
}
