import { GraphEntryValue } from "./types/graph";
declare class ToolDbService {
    private debug;
    /**
     * These can be customized depending on your db of choice.
     */
    dbInit: () => void;
    dbRead: <T>(key: string) => Promise<T>;
    dbWrite: <T>(key: string, msg: T) => void;
    triggerPut: (msg: GraphEntryValue<any>) => void;
    onMessage: (msg: GraphEntryValue<any>, peerId: string) => void;
    private _customVerification;
    /**
     * Adds an extra verification step for messages at the given key.
     * You can compare against a previously stored value using the value given at the callback.
     * The callback should return a boolean for if the message passed the verification step.
     * @param key data key
     * @param fn (stored, incoming) => boolean
     */
    addVerification: (key: string, fn: (oldData: GraphEntryValue<any> | undefined, data: GraphEntryValue<any>) => boolean) => void;
    private dataPutHandler;
    messageWrapper: (data: GraphEntryValue<any>) => Promise<unknown>;
    constructor(debug?: boolean);
}
export default ToolDbService;
