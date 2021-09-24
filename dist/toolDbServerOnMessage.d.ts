import WebSocket from "ws";
import ToolDb from "./tooldb";
/**
 * Triggers a GET request to other peers. If the data is available locally it will return that instead.
 * @param key key of the data
 * @param userNamespaced If this key bolongs to a user or its public. Making it private will enforce validation for our public key and signatures.
 * @param timeout Max time to wait for remote.
 * @returns Promise<Data>
 */
export default function toolDbServerOnMessage(this: ToolDb, message: WebSocket.Data, socket: WebSocket): Promise<void>;
