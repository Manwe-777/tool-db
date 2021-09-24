import { ToolDbMessage } from ".";
import ToolDb from "./tooldb";

export default function toolDbClientOnMessage(
  this: ToolDb,
  message: ToolDbMessage,
  socket: any // Hm browser websocket types??
): Promise<void> {
  return new Promise((resolve, reject) => {
    // socket.send("something");
    console.log(message);
  });
}
