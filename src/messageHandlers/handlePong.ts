import { PongMessage, ToolDb, ToolDbMessage } from "..";

export default function handlePong(
  this: ToolDb,
  message: PongMessage,
  remotePeerId: string
) {
  this.onConnect();
}
