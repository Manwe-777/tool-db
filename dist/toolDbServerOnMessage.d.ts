import WebSocket from "ws";
import ToolDb from "./tooldb";
export default function toolDbServerOnMessage(this: ToolDb, data: WebSocket.Data, socket: WebSocket): Promise<void>;
