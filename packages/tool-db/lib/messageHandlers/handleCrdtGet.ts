import { ToolDb, CrdtGetMessage, CrdtPutMessage } from "..";

export default function handleCrdtGet(
  this: ToolDb,
  message: CrdtGetMessage,
  remotePeerId: string
) {
  this.store
    .get(message.key)
    .then((data) => {
      try {
        // Use the id of the get so the other client knows we are replying
        const oldData = {
          type: "crdtPut",
          data: JSON.parse(data),
          to: [],
          id: message.id,
        } as CrdtPutMessage;
        this.network.sendToClientId(remotePeerId, oldData);
      } catch (e) {
        // socket.send(data);
        // do nothing
      }
    })
    .catch((e) => {
      const finalMessage: CrdtGetMessage = {
        ...message,
        to: [...message.to, remotePeerId],
      };

      this.logger("Local key not found, relay", JSON.stringify(finalMessage));
      this.network.sendToAll(finalMessage, false);
    });
}
