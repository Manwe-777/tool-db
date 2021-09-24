import Automerge, { FreezeObject } from "automerge";
import WebSocket from "ws";
import { ToolDbMessage } from ".";
import ToolDb from "./tooldb";

export default function toolDbServerOnMessage(
  this: ToolDb,
  data: WebSocket.Data,
  socket: WebSocket
): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log("server got:", data);
    if (typeof data === "string") {
      const message: ToolDbMessage = JSON.parse(data);

      if (message.type === "get") {
        let doc: FreezeObject<any> | undefined;
        if (this.documents[message.key]) {
          doc = this.documents[message.key];
        } else {
          this.store.get(message.key, (err, data) => {
            if (!err) {
              console.log("Automerge load data from db", data);
              doc = Automerge.load(data);
            }
          });
        }

        if (doc) {
          socket.send({});
        } else {
          // say we got nothing
        }
      }
      if (message.type === "put") {
        this.store.put(message.data.key, message.data, (err, data) => {
          //
        });
      }
    }
  });
}
