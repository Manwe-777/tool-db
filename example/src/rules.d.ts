import type { VerificationData } from "tool-db";

export const CHAT_TOPIC: string;

export function onlyOwnJoinRequests(
  msg: VerificationData<{ k: string }[]>
): Promise<boolean>;
