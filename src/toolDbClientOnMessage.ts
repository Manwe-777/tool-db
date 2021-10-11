import { ToolDbMessage, VerifyResult } from ".";
import ToolDb from "./tooldb";
import toolDbVerificationWrapper from "./toolDbVerificationWrapper";

export default function toolDbClientOnMessage(
  this: ToolDb,
  data: ToolDbMessage,
  socket: any // Hm browser websocket types??
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof data === "string") {
      const message: ToolDbMessage = JSON.parse(data);
      console.log(message);

      // Check if we are listening for this ID
      if (message.id) {
        const msgId = message.id;
        if (this._idListeners[msgId]) {
          this._idListeners[msgId](message);
          this.removeIdListener(msgId);
        }
      }

      if (message.type === "get") {
        this.store.get(message.key, (err, data) => {
          if (!err) {
            socket.send(data);
          } else {
            socket.send(data);
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

            this.store.put(message.key, message, (err, data) => {
              //
            });
          }
        });
      }
    }
  });
}
