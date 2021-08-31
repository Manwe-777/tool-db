import toolChainClient from "./toolChainClient";
import { GraphEntryValue, UserRootData } from "./types/graph";
export default function toolChainSignUp(this: toolChainClient, user: string, password: string): Promise<GraphEntryValue<UserRootData>>;
