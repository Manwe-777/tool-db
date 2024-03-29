import { ToolDb, ToolDbMessage } from ".";

export default function toolDbClientOnMessage(
  this: ToolDb,
  message: ToolDbMessage,
  remotePeerId: string
) {
  if (!this.processedIds[message.type]) {
    this.processedIds[message.type] = [];
  }
  if (this.processedIds[message.type].includes(message.id)) {
    // this.logger(
    //   `Already processed this message > ${message.type} from ${remotePeerId}`
    // );
    return;
  }

  this.emit("message", message, remotePeerId);

  this.processedIds[message.type].push(message.id);

  this.logger(`Got message ${message.type} from ${remotePeerId}`);
  this.logger(message);

  // Check if we are listening for this ID
  if (message.id) {
    const msgId = message.id;
    if (this._idListeners[msgId]) {
      this._idListeners[msgId](message);
      this.removeIdListener(msgId);
    }
  }

  if (message === undefined || message.type === undefined) {
    this.logger("Message is invalid!", message, typeof message);
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

    case "function":
      this.handleFunction(message, remotePeerId);
      break;

    default:
      break;
  }
}
