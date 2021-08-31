import toolChainClient from "./toolChainClient";
import { GraphEntryValue } from "./types/graph";
export default function toolChainPut<T = any>(this: toolChainClient, key: string, value: T, userNamespaced?: boolean): Promise<GraphEntryValue | null>;
