import {
  ToolDb,
  PutMessage,
  CrdtPutMessage,
  SubscribeMessage,
  createCrdtData,
  isCrdtData,
} from "..";

/**
 * Crafts the message to send stored or updated data to a subscriber.
 * CRDT documents are sent as CRDT puts with their signed change sets.
 */
function subscriptionMessage(
  data: any,
  id: string
): PutMessage | CrdtPutMessage {
  if (isCrdtData(data)) {
    return {
      type: "crdtPut",
      id,
      to: [],
      data: createCrdtData(data.k, data.c, data.sets),
    };
  }

  return { type: "put", id, to: [], data };
}

export default function handleSubscribe(
  this: ToolDb,
  message: SubscribeMessage,
  remotePeerId: string
) {
  const subId = remotePeerId + "-" + message.key;
  if (!this.subscriptions.includes(subId)) {
    this.subscriptions.push(subId);

    this.addKeyListener(message.key, (msg) => {
      if (remotePeerId) {
        // We do not reply to the socket directly
        // instead we use the client id, in case the socket reconnects
        this.network.sendToClientId(
          remotePeerId,
          subscriptionMessage(msg, message.id)
        );
      }
    });
  }

  // basically the exact same as GET, below
  this.store
    .get(message.key)
    .then((data) => {
      try {
        this.network.sendToClientId(
          remotePeerId,
          subscriptionMessage(JSON.parse(data), message.id),
          false
        );
      } catch (e) {
        // do nothing
      }
    })
    .catch((e) => {
      // do nothing
    });
}
