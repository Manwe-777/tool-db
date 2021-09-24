import { ToolDbMessage } from ".";
import ToolDb from "./tooldb";
export default class WSS {
    private wnd;
    private _wss;
    private options;
    private server;
    private _tooldb;
    private _connections;
    private _activePeers;
    get activePeers(): string[];
    constructor(db: ToolDb);
    /**
     * Open a connection to a federated server
     * @param url URL of the server (including port)
     * @returns websocket
     */
    open: (url: string) => any | undefined;
    send(msg: ToolDbMessage): void;
    private reconnect;
    get tooldb(): ToolDb;
}
