import { ToolDbMessage } from ".";
import ToolDb from "./tooldb";

export default function toolDbClientOnMessage(
  this: ToolDb,
  message: ToolDbMessage,
  remotePeerId: string
) {
  // console.warn(
  //   `Got message > ${remotePeerId}`,
  //   message.type,
  //   (message as any).k || "",
  //   message
  // );

  // Check if we are listening for this ID
  if (message.id) {
    const msgId = message.id;
    if (this._idListeners[msgId]) {
      this._idListeners[msgId](message);
      this.removeIdListener(msgId);
    }
  }

  if (message === undefined || message.type === undefined) {
    console.warn("Message is invalid!", message, typeof message);
    return;
  }

  switch (message.type) {
    case "ping":
      this.handlePing(message, remotePeerId);
      break;

    case "pong":
      this.handlePong(message, remotePeerId);
      break;

    case "subscribe":
      this.handleSubscribe(message, remotePeerId);
      break;

    case "get":
      this.handleGet(message, remotePeerId);
      break;

    case "put":
      this.handlePut(message, remotePeerId);
      break;

    case "crdtPut":
      this.handleCrdtPut(message, remotePeerId);
      break;

    case "crdtGet":
      this.handleCrdtGet(message, remotePeerId);
      break;

    case "query":
      this.handleQuery(message, remotePeerId);
      break;

    case "crdt":
      this.handleCrdt(message, remotePeerId);
      break;

    default:
      break;
  }
}
