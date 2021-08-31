import { GraphEntryValue } from "./types/graph";
declare class ToolChainService {
    private debug;
    /**
     * These can be customized depending on your db of choice.
     */
    dbInit: () => void;
    dbRead: <T>(key: string) => Promise<T>;
    dbWrite: <T>(key: string, msg: T) => void;
    triggerPut: (msg: GraphEntryValue) => void;
    triggerGet: (msg: GraphEntryValue) => void;
    onMessage: (msg: GraphEntryValue, peerId: string) => void;
    private _customPutVerification;
    private _customGetVerification;
    /**
     * Adds an extra verification step for messages of type PUT at the given key.
     * You can compare against a previously stored value using the value given at the callback.
     * The callback should return a boolean for if the message passed the verification step.
     * @param key data key
     * @param fn (stored, incoming) => boolean
     */
    addPutVerification: (key: string, fn: (oldData: GraphEntryValue | undefined, data: GraphEntryValue) => boolean) => void;
    private dataPutHandler;
    messageWrapper: (data: GraphEntryValue) => Promise<unknown>;
    constructor(debug?: boolean);
}
export default ToolChainService;
