import Peer from "peerjs";
import toolChainAnonSignIn from "./toolChainAnonSignIn";
import toolChainGet from "./toolChainGet";
import toolChainGetPubKey from "./toolChainGetPubKey";
import toolChainPut from "./toolChainPut";
import toolChainSignIn from "./toolChainSignIn";
import toolChainSignUp from "./toolChainSignUp";
import { GraphEntryValue } from "./types/graph";
import { AnyMessage, MessageGet, MessagePut } from "./types/message";
import { KeyPair } from "./utils/crypto/generateKeyPair";
import localForageInit from "./utils/localForage/localForageInit";
import localForageRead from "./utils/localForage/localForageRead";
import localForageWrite from "./utils/localForage/localForageWrite";
declare class ToolChain {
    private currentPeer;
    private connectionsList;
    private namespace;
    private currentPeerNumber;
    private currentPeerId;
    private debug;
    private peersList;
    /**
     * Basic usage
     */
    getData: typeof toolChainGet;
    putData: typeof toolChainPut;
    getPubKey: typeof toolChainGetPubKey;
    signIn: typeof toolChainSignIn;
    anonSignIn: typeof toolChainAnonSignIn;
    signUp: typeof toolChainSignUp;
    /**
     * These can be customized depending on your db of choice.
     */
    dbInit: typeof localForageInit;
    dbRead: typeof localForageRead;
    dbWrite: typeof localForageWrite;
    /**
     * More customizable stuff
     */
    onConnected: () => void;
    onPeerConnected: (id: string) => void;
    onMessage: (msg: AnyMessage, peerId: string) => void;
    /**
     * Private stuff
     */
    private messagesIndex;
    private keyListeners;
    private keyUpdateListeners;
    user: {
        keys: {
            signKeys: KeyPair;
            encryptionKeys: KeyPair;
        };
        name: string;
    } | undefined;
    private _listenForKey;
    private _listenForKeyUpdate;
    get listenForKey(): (key: string, fn: (val: any) => void) => void;
    /**
     * Adds a callback listener for the given key.
     * Can be removed using removeKeyUpdateListener(key)
     */
    get addKeyUpdateListener(): (key: string, fn: (val: any) => void) => void;
    /**
     * Removes the updates listener on the given key, if any.
     * @param key string
     */
    removeKeyUpdateListener(key: string): void;
    private _customPutVerification;
    private _customGetVerification;
    /**
     * Adds an extra verification step for messages of type PUT at the given key.
     * You can compare against a previously stored value using the value given at the callback.
     * The callback should return a boolean for if the message passed the verification step.
     * @param key data key
     * @param fn (stored, incoming) => boolean
     */
    addPutVerification: (key: string, fn: (oldMessage: GraphEntryValue | undefined, msg: MessagePut) => boolean) => void;
    /**
     * Adds an extra verification step for messages of type GET at the given key.
     * You can compare against a previously stored value using the value given at the callback.
     * The callback should return a boolean for if the message passed the verification step.
     * @param key data key
     * @param fn (stored, incoming) => boolean
     */
    addGetVerification: (key: string, fn: (oldMessage: GraphEntryValue | undefined, msg: MessageGet) => boolean) => void;
    private checkMessageIndex;
    private msgPutHandler;
    private msgGetHandler;
    private _onMessageWrapper;
    private generateNewId;
    constructor(namespace: string, debug?: boolean);
    get id(): string;
    get getPeer(): Peer | undefined;
    get getConnections(): Record<string, Peer.DataConnection | null>;
    private connectTo;
    private _rewirePeers;
    private rewirePeersIimeout;
    private rewirePeers;
    private reconnectSignalling;
    private finishInitPeer;
    initialize(): void;
    disconnect(): void;
    sendMessage(msg: AnyMessage): void;
}
export default ToolChain;
