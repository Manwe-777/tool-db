import { PongMessage, ToolDbMessage, VerifyResult } from ".";
import ToolDb from "./tooldb";
import toolDbVerificationWrapper from "./toolDbVerificationWrapper";

export default function toolDbClientOnMessage(
  this: ToolDb,
  data: string,
  socket: any // Hm browser websocket types??
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof data === "string") {
      const message: ToolDbMessage = JSON.parse(data);
      console.log("toolDbClientOnMessage", message);

      // Check if we are listening for this ID
      if (message.id) {
        const msgId = message.id;
        if (this._idListeners[msgId]) {
          this._idListeners[msgId](message);
          this.removeIdListener(msgId);
        }
      }

      if (message.type === "ping") {
        socket.send(
          JSON.stringify({
            type: "pong",
            id: message.id,
          } as PongMessage)
        );
      }

      if (message.type === "subscribe") {
        this.addKeyListener(message.key, (msg) => {
          if (msg.type === "put") {
            socket.send(JSON.stringify(msg));
          }
        });
      }

      if (message.type === "get") {
        this.store.get(message.key, (err, data) => {
          if (!err) {
            // Use the id of the get so the other client knows we are replying
            const oldData = { ...JSON.parse(data), id: message.id };
            socket.send(JSON.stringify(oldData));
          } else {
            // socket.send(data);
          }
        });
      }

      if (message.type === "put") {
        toolDbVerificationWrapper.call(this, message).then((value) => {
          if (value === VerifyResult.Verified) {
            const key = message.key;
            this._keyListeners.forEach((listener) => {
              if (listener?.key === key) {
                listener.timeout = setTimeout(
                  () => listener.fn(message),
                  100
                ) as any;
              }
            });

            this.store.put(
              message.key,
              JSON.stringify(message),
              (err, data) => {
                //
              }
            );
          } else {
            console.log("unverified message", value, message);
          }
        });
      }
    }
  });
}
