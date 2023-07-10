import { FunctionMessage, FunctionReturnMessage, ToolDb } from "..";

export default function handleFunction(
  this: ToolDb,
  message: FunctionMessage,
  remotePeerId: string
) {
  // executes the given function by message on the server if it exists
  if (this.functions[message.function]) {
    try {
      this.functions[message.function](message.args)
        .then((ret) => {
          const messageReturn: FunctionReturnMessage = {
            return: ret,
            type: "functionReturn",
            id: message.id,
            code: "OK",
            to: [],
          };

          this.network.sendToClientId(remotePeerId, messageReturn);
        })
        .catch((e) => {
          const messageReturn: FunctionReturnMessage = {
            return: JSON.stringify(e),
            type: "functionReturn",
            id: message.id,
            code: "ERR",
            to: [],
          };

          this.network.sendToClientId(remotePeerId, messageReturn);
        });
    } catch (e: any) {
      // something went wrong, nothing to do here
      // We might want to return the exception to the client?
      const messageReturn: FunctionReturnMessage = {
        return: e.toString(),
        type: "functionReturn",
        id: message.id,
        code: "ERR",
        to: [],
      };

      this.network.sendToClientId(remotePeerId, messageReturn);
    }
  } else {
    // function not found
    const messageReturn: FunctionReturnMessage = {
      return: "Function not found",
      type: "functionReturn",
      id: message.id,
      code: "NOT_FOUND",
      to: [],
    };

    this.network.sendToClientId(remotePeerId, messageReturn);
  }
}
