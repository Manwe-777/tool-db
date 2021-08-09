import ToolChain from ".";
import { GraphEntryValue, UserRootData } from "./types/graph";
export default function toolChainSignUp(this: ToolChain, user: string, password: string): Promise<GraphEntryValue<UserRootData>>;
