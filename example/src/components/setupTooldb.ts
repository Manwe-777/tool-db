import React from "react";

import { AllActions } from "../state/actions";
import { GroupData, GroupsList, Message, WrappedGroupKeyData } from "../types";
import getToolDb from "../utils/getToolDb";
import {
  decryptGroupMessage,
  isEncryptedMessage,
  unwrapGroupKey,
  cacheGroupKey,
  getCachedGroupKey,
} from "../utils/groupCrypto";
import { getCurrentKeys } from "../utils/encryptionKeyManager";

function setupTooldbInternal(
  dispatch: React.Dispatch<AllActions>,
  toolDb: ReturnType<typeof getToolDb>,
  selfAddress: string
) {
  // Maintain a little state here aside from the component
  const wrappedGroups: string[] = [];

  // Track which group keys we've tried to fetch
  const fetchedGroupKeys: string[] = [];

  function setGroupDataWrapper(groupData: GroupData) {
    dispatch({
      type: "SET_GROUP_DATA",
      groupId: groupData.id,
      members: groupData.members,
      name: groupData.name,
      owners: groupData.owners,
    });

    // Update the members
    groupData.members.forEach((memberAddress) => {
      console.warn(`Fetch ${memberAddress} group data (${groupData.id})`);
      toolDb.getData(`:${memberAddress}.name`);
      toolDb.getData(`:${memberAddress}.pubKey`);
      toolDb.getData(`:${memberAddress}.encPubKey`);

      // Listen for messages of this member
      const userGroupKey = `:${memberAddress}.group-${groupData.id}`;
      toolDb.subscribeData(userGroupKey);
      toolDb.getData(userGroupKey);
    });

    // Try to fetch our wrapped group key (if we're a member)
    const groupKeyId = `groupKey-${groupData.id}-${selfAddress}`;
    if (
      !fetchedGroupKeys.includes(groupKeyId) &&
      !getCachedGroupKey(groupData.id)
    ) {
      fetchedGroupKeys.push(groupKeyId);
      toolDb.subscribeData(groupKeyId);
      toolDb.getData(groupKeyId);
    }
  }

  toolDb.on("data", (data: any) => {
    const owner = data.k.split(".")[0].slice(1);
    const key = data.k.slice(data.k.split(".")[0].length + 1);

    if (owner === selfAddress) {
      // :{address}.groups
      if (key === "groups") {
        dispatch({
          type: "SET_ALL_GROUPS_LIST",
          groups: data.v,
        });

        (data.v as GroupsList).forEach((group) => {
          const groupKey = `==${group.split("-")[0]}`;

          const foundListener =
            toolDb._keyListeners.filter((l) => l?.key === groupKey).length > 0;

          // If we dont have a listener for this group yet
          if (!foundListener) {
            toolDb.subscribeData(groupKey);
            toolDb.getData(groupKey);
          }
        });
      }
    }

    // Frozen namespaces
    if (data.k.startsWith("==") && !wrappedGroups.includes(data.k)) {
      // If this is a group key we subscribed to
      // =={groupId}
      if (data.v.name && data.v.members && data.v.owners) {
        wrappedGroups.push(data.k);
        setGroupDataWrapper(data.v);
      }
    }

    // :{address}.group-{groupid}
    // group messages
    if (key.startsWith("group-")) {
      const groupId = key.slice(6);
      const messages: Message[] = data.v;

      // Decrypt all encrypted messages - keep original 'm' intact, set 'decrypted' field
      Promise.all(
        messages.map(async (msg) => {
          // Check if message is encrypted (has the e flag AND message content looks encrypted)
          if (msg.e && isEncryptedMessage(msg.m)) {
            try {
              const decryptedText = await decryptGroupMessage(msg.m, groupId);
              // Keep original m, add decrypted for display
              return { ...msg, decrypted: decryptedText };
            } catch (error) {
              console.error("Failed to decrypt message:", error);
              // Return message as-is if decryption fails (might be malformed)
              return {
                ...msg,
                decrypted: "[Encrypted message - decryption failed]",
              };
            }
          }
          // If e=true but message is not encrypted format (already decrypted/plaintext)
          // This handles corrupted data from the bug - just use m as-is
          if (msg.e && !isEncryptedMessage(msg.m)) {
            return { ...msg, decrypted: msg.m };
          }
          // Return unencrypted message as-is (for backwards compatibility)
          return msg;
        })
      ).then((decryptedMessages) => {
        dispatch({
          type: "SET_USER_GROUP_MESSAGES",
          userId: owner,
          groupId,
          messages: decryptedMessages,
        });
      });
    }

    // :{address}.name
    if (key === "name") {
      dispatch({
        type: "SET_USER_NAME",
        userId: owner,
        username: data.v,
      });
    }

    // :{address}.pubKey (signing key)
    if (key === "pubKey") {
      dispatch({
        type: "SET_USER_PUBKEY",
        userId: owner,
        pubKey: data.v,
      });
    }

    // :{address}.encPubKey (encryption key)
    if (key === "encPubKey") {
      dispatch({
        type: "SET_USER_ENC_KEY",
        userId: owner,
        encKey: data.v,
      });
    }

    // groupKey-{groupId}-{memberAddress} (wrapped group key)
    if (data.k.startsWith("groupKey-")) {
      const parts = data.k.split("-");
      const groupId = parts[1];
      const targetMember = parts.slice(2).join("-"); // Handle addresses with dashes

      // Only process keys wrapped for us
      if (targetMember === selfAddress) {
        const wrappedKey: WrappedGroupKeyData = data.v;
        const ourKeys = getCurrentKeys();

        if (ourKeys && wrappedKey && wrappedKey.from) {
          // We need the sender's encryption public key to unwrap
          toolDb
            .getData<string>(`:${wrappedKey.from}.encPubKey`)
            .then((senderKey) => {
              if (senderKey) {
                unwrapGroupKey(
                  { iv: wrappedKey.iv, key: wrappedKey.key },
                  ourKeys.privateKey,
                  senderKey
                )
                  .then((groupKey) => {
                    cacheGroupKey(groupId, groupKey);
                  })
                  .catch(() => {
                    // Failed to unwrap group key - may be corrupted or wrong keys
                  });
              }
            });
        }
      }
    }
  });

  toolDb.subscribeData("groups", true);
  toolDb.getData<GroupsList>("groups", true);
}

export default function setupTooldb(dispatch: React.Dispatch<AllActions>) {
  const toolDb = getToolDb();
  // Ensure database is ready before accessing user account
  toolDb.ready
    .then(() => {
      const selfAddress = toolDb.userAccount.getAddress() || "";
      setupTooldbInternal(dispatch, toolDb, selfAddress);
    })
    .catch((err) => {
      console.error("Failed to initialize ToolDb in setupTooldb:", err);
    });
}
