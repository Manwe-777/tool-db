import { ToolDbMessage } from ".";
import ToolDb from "./tooldb";

export default function toolDbClientOnMessage(
  this: ToolDb,
  message: ToolDbMessage,
  remotePeerId: string
) {
  if (!this.processedIds[message.type]) {
    this.processedIds[message.type] = [];
  }
  if (this.processedIds[message.type].includes(message.id)) {
    // console.warn(
    //   `Already processed this message > ${message.type} from ${remotePeerId}`
    // );
    return;
  }

  this.emit("message", message, remotePeerId);

  this.processedIds[message.type].push(message.id);

  if (this.options.debug) {
    console.warn(`Got message ${message.type} from ${remotePeerId}`);
    console.warn(message);
  }

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
