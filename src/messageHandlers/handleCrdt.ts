import { CrdtMessage, ToolDb } from "..";

export default function handleCrdt(
  this: ToolDb,
  message: CrdtMessage,
  remotePeerId: string
) {
  const key = message.key;
  this.triggerKeyListener(key, message);

  this.store.put(`${key}.crdt`, message.doc, (err, data) => {
    //
  });
}
