import {
  base64ToBinaryDocument,
  CrdtMessage,
  PongMessage,
  PutMessage,
  textRandom,
  ToolDbMessage,
  uint8ToBase64,
  VerifyResult,
} from ".";
import ToolDb from "./tooldb";
import toolDbVerificationWrapper from "./toolDbVerificationWrapper";

import Automerge from "automerge";
import base64ToBinaryChange from "./utils/base64ToBinaryChange";
import { ToolDbWebSocket } from "./wss";

export default function toolDbClientOnMessage(
  this: ToolDb,
  data: string,
  socket: ToolDbWebSocket
) {
  const originalData = data;
  if (typeof data === "string") {
    const message: ToolDbMessage = JSON.parse(data);
    // console.log(
    //   "Got message > ",
    //   data,
    //   message.type,
    //   (message as any).key || ""
    // );

    // Check if we are listening for this ID
    if (message.id) {
      const msgId = message.id;
      if (this._idListeners[msgId]) {
        this._idListeners[msgId](message);
        this.removeIdListener(msgId);
      }
    }

    if (message.type === "ping") {
      socket.toolDbId = message.id;
      this.websockets._clientSockets[message.id] = socket;
      socket.send(
        JSON.stringify({
          type: "pong",
          id: this.options.id,
        } as PongMessage)
      );
    }

    if (message.type === "pong") {
      socket.toolDbId = message.id;
      this.websockets._clientSockets[message.id] = socket;
    }

    if (message.type === "subscribe") {
      if (socket.toolDbId) {
        const subId = socket.toolDbId + "-" + message.key;
        if (!this.subscriptions.includes(subId)) {
          this.subscriptions.push(subId);

          this.addKeyListener(message.key, (msg) => {
            if (
              (msg.type === "put" || msg.type === "crdt") &&
              socket.toolDbId
            ) {
              // We do not reply to the socket directly
              // instead we use the client id, in case the socket reconnects
              this.websockets.sendToClientId(socket.toolDbId, msg);
            }
          });
        }
      }

      // basically the exact same as GET, below
      this.store.get(message.key, (err, data) => {
        if (data) {
          try {
            const oldData = { ...JSON.parse(data), id: message.id };
            socket.send(JSON.stringify(oldData));
          } catch (e) {
            // do nothing
          }
        }
      });

      this.loadCrdtDocument(message.key, false).then((doc) => {
        // console.log("Load crdt from subscribe", message.key, doc);
        if (doc) {
          const savedDoc = Automerge.save(doc);
          // console.log("saved", savedDoc);
          const msg: CrdtMessage = {
            type: "crdt",
            key: message.key,
            id: textRandom(10),
            doc: uint8ToBase64(savedDoc),
          };
          socket.send(JSON.stringify(msg));
        }
      });
    }

    if (message.type === "get") {
      this.store.get(message.key, (err, data) => {
        if (data) {
          try {
            // Use the id of the get so the other client knows we are replying
            const oldData = {
              type: "put",
              ...JSON.parse(data),
              id: message.id,
            } as PutMessage;
            socket.send(JSON.stringify(oldData));
          } catch (e) {
            // socket.send(data);
            // do nothing
          }
        } else {
          if (this.options.debug) {
            console.log("Local key not found, relay", originalData);
          }
          Object.keys(this.websockets.clientSockets).forEach((socketId) => {
            if (`${socketId}` !== `${socket.toolDbId}`) {
              const socket = this.websockets.clientSockets[socketId];
              console.log("Sending to", socketId);
              socket.send(originalData);
            }
          });
        }
      });
    }

    if (message.type === "put") {
      toolDbVerificationWrapper.call(this, message).then((value) => {
        if (value === VerifyResult.Verified) {
          // relay to other servers
          this.websockets.send(message, message.to);

          this.store.get(message.k, (err, oldData: string) => {
            if (oldData) {
              const parsedOldData: PutMessage = JSON.parse(oldData);
              if (parsedOldData.t < message.t) {
                const key = message.k;
                this.triggerKeyListener(key, message);
                this.store.put(
                  message.k,
                  JSON.stringify(message),
                  (err, data) => {
                    //
                  }
                );
              }
              // } else if (this.options.debug) {
              //   console.log(
              //     `${message.k} has old data, but its newer. old ${parsedOldData.t} < new ${message.t}`
              //   );
              // }
            } else {
              const key = message.k;
              this.triggerKeyListener(key, message);
              this.store.put(
                message.k,
                JSON.stringify(message),
                (err, data) => {
                  //
                }
              );
            }
          });
        } else {
          console.log("unverified message", value, message);
        }
      });
    }

    if (message.type === "crdtPut") {
      // key = aggregated, final value
      // key.crdt = automerge doc with changes
      const writeStart = new Date().getTime();
      toolDbVerificationWrapper.call(this, message).then((value) => {
        if (value === VerifyResult.Verified) {
          const key = message.k;
          let data: string[] = [];
          try {
            data = JSON.parse(message.v);
          } catch (e) {
            //
          }
          const changes = data.map(base64ToBinaryChange);

          this.loadCrdtDocument(key).then((currentDoc) => {
            // if (currentDoc) {
            //   console.log(
            //     "loaded",
            //     key,
            //     currentDoc,
            //     Automerge.getHistory(currentDoc)
            //   );
            // }

            try {
              const [newDoc, patch] = Automerge.applyChanges(
                currentDoc || Automerge.init(),
                changes
              );

              // if (newDoc) {
              //   console.log(
              //     "new document changes:",
              //     Automerge.getHistory(newDoc)
              //   );
              // }

              // persist
              this.documents[key] = newDoc;
              const savedDoc = Automerge.save(newDoc);
              this.store.put(`${key}.crdt`, savedDoc, (err, data) => {
                const writeEnd = new Date().getTime();
                console.log("CRDT write: ", (writeEnd - writeStart) / 1000);
              });

              const crdtMessage: CrdtMessage = {
                type: "crdt",
                key: key,
                id: message.id,
                doc: uint8ToBase64(savedDoc),
              };
              this.triggerKeyListener(key, crdtMessage);

              // relay to other servers
              this.websockets.send(crdtMessage, message.to);
            } catch (e) {
              if (this.options.debug) {
                console.log(e);
              }
            }
          });
        } else {
          console.log("unverified message", value, message);
        }
      });
    }

    if (message.type === "crdtGet") {
      this.loadCrdtDocument(message.key).then((currentDoc) => {
        const saved = Automerge.save(currentDoc || Automerge.init());
        socket.send(
          JSON.stringify({
            type: "crdt",
            id: message.id,
            key: message.key,
            doc: uint8ToBase64(saved),
          } as CrdtMessage)
        );
      });
    }

    if (message.type === "crdt") {
      const key = message.key;
      this.triggerKeyListener(key, message);

      const savedDoc = base64ToBinaryDocument(message.doc);
      this.store.put(`${key}.crdt`, savedDoc, (err, data) => {
        //
      });
    }
  }
}
