import { ToolDb, GetMessage, PutMessage } from "..";

export default function handleGet(
  this: ToolDb,
  message: GetMessage,
  remotePeerId: string
) {
  this.store
    .get(message.key)
    .then((data) => {
      try {
        // Use the id of the get so the other client knows we are replying
        const oldData = {
          type: "put",
          data: JSON.parse(data),
          to: [],
          id: message.id,
        } as PutMessage;
        this.network.sendToClientId(remotePeerId, oldData);
      } catch (e) {
        // socket.send(data);
        // do nothing
      }
    })
    .catch((e) => {
      const finalMessage: GetMessage = {
        ...message,
        to: [...message.to, remotePeerId],
      };

      this.logger("Local key not found, relay", JSON.stringify(finalMessage));
      this.network.sendToAll(finalMessage, false);
    });
}
