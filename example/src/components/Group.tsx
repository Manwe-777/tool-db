/* eslint-disable no-nested-ternary */
/* eslint-disable react/no-array-index-key */
import _ from "lodash";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

import { MapCrdt, MapChanges } from "tool-db";

import ChatMessage from "./ChatMessage";
import getToolDb from "../utils/getToolDb";
import {
  GroupData,
  GlobalState,
  GroupsList,
  Message,
  WrappedGroupKeyData,
} from "../types";
import { AllActions } from "../state/actions";
import { getCachedGroupKey, wrapGroupKeyForMember } from "../utils/groupCrypto";
import { getCurrentKeys } from "../utils/encryptionKeyManager";

interface GroupProps {
  state: GlobalState;
  sendMessage: (groupId: string, message: string) => void;
  dispatch: React.Dispatch<AllActions>;
}

export default function Group(props: GroupProps) {
  const { state, sendMessage, dispatch } = props;
  const { groupRoute } = useParams();
  const toolDb = getToolDb();

  const groupKey = `==${decodeURIComponent(groupRoute || "")}`;

  const groupId = decodeURIComponent(groupRoute || "");

  const joinRequests = useRef<MapCrdt<string>>(
    new MapCrdt<string>(toolDb.userAccount.getAddress() || "")
  );

  const [_refresh, setRefresh] = useState(0);
  const [message, setMessage] = useState("");

  // Check if we asked this group to join already
  function checkIfWeJoined() {
    return (
      joinRequests.current
        .getChanges()
        .filter((ch) => ch.k === toolDb.userAccount.getAddress()).length !== 0
    );
  }

  // Check if we are the group owners
  function areWeOwners() {
    return (
      state.groups[groupId]?.owners.includes(
        toolDb.userAccount.getAddress() || ""
      ) || false
    );
  }

  useEffect(() => {
    const listeners: number[] = [];
    if (groupRoute) {
      toolDb.getData<GroupData>(groupKey);

      // Add listener for join requests
      const requestsListenerId = toolDb.addKeyListener<MapChanges<string>[]>(
        `requests-${groupId}`,
        (msg) => {
          joinRequests.current.mergeChanges(msg.v);
          // Fetch encryption keys for all join requesters so we can wrap group keys for them
          Object.keys(joinRequests.current.value).forEach((requesterId) => {
            if (!state.encryptionKeys[requesterId]) {
              toolDb.getData(`:${requesterId}.encPubKey`);
              toolDb.getData(`:${requesterId}.name`);
            }
          });
          setRefresh(new Date().getTime());
        }
      );
      listeners.push(requestsListenerId);
      toolDb.subscribeData(`requests-${groupId}`);
      toolDb.getCrdt(`requests-${groupId}`, joinRequests.current);
    }

    // Clear listeners
    return () => {
      listeners.forEach((id) => {
        toolDb.removeKeyListener(id);
      });
    };
  }, [groupRoute]);

  const addMember = useCallback(
    async (id: string) => {
      if (
        state.groups[groupId] &&
        groupRoute &&
        !state.groups[groupId].members.includes(id)
      ) {
        const selfAddress = toolDb.userAccount.getAddress() || "";

        // Get the group encryption key and wrap it for the new member
        const groupEncKey = getCachedGroupKey(groupId);
        const ourKeys = getCurrentKeys();

        // Try to get encryption key from state, or fetch directly if missing
        let newMemberEncPubKey: string | undefined = state.encryptionKeys[id];
        if (!newMemberEncPubKey) {
          console.log(`Fetching encryption key for new member ${id}...`);
          const fetchedKey = await toolDb.getData<string>(`:${id}.encPubKey`);
          newMemberEncPubKey = fetchedKey || undefined;
        }

        console.log(`Adding member ${id} to group ${groupId}:`, {
          hasGroupKey: !!groupEncKey,
          hasOurKeys: !!ourKeys,
          hasTheirKey: !!newMemberEncPubKey,
        });

        if (groupEncKey && ourKeys && newMemberEncPubKey) {
          // Wrap the group key for the new member
          const wrappedKey = await wrapGroupKeyForMember(
            groupEncKey,
            ourKeys.privateKey,
            newMemberEncPubKey
          );

          const wrappedKeyData: WrappedGroupKeyData = {
            ...wrappedKey,
            from: selfAddress, // We wrapped it, they need our encPubKey to unwrap
          };

          console.log(
            `Storing wrapped group key for ${id}:`,
            `groupKey-${groupId}-${id}`
          );
          // Store the wrapped group key for the new member
          await toolDb.putData<WrappedGroupKeyData>(
            `groupKey-${groupId}-${id}`,
            wrappedKeyData
          );
          console.log(`Successfully wrapped and stored group key for ${id}`);
        } else {
          console.warn(`Cannot wrap group key for ${id}: missing keys`, {
            hasGroupKey: !!groupEncKey,
            hasOurKeys: !!ourKeys,
            hasTheirKey: !!newMemberEncPubKey,
          });
        }

        // Remove from join requests after accepting
        joinRequests.current.DEL(id);
        toolDb.putCrdt(`requests-${groupId}`, joinRequests.current, false);

        const groupToAdd: GroupData = {
          id: groupId,
          name: state.groups[groupId].name,
          owners: state.groups[groupId].owners,
          members: [...state.groups[groupId].members, id],
        };
        toolDb.putData<GroupData>(groupKey, groupToAdd);
        dispatch({
          type: "SET_GROUP_DATA",
          groupId: groupToAdd.id,
          members: groupToAdd.members,
          name: groupToAdd.name,
          owners: groupToAdd.owners,
        });
        setRefresh(new Date().getTime());
      }
    },
    [groupRoute, state.encryptionKeys]
  );

  const denyRequest = useCallback(
    (id: string) => {
      // Remove the join request from the CRDT
      joinRequests.current.DEL(id);
      toolDb.putCrdt(`requests-${groupId}`, joinRequests.current, false);
      setRefresh(new Date().getTime());
    },
    [groupRoute]
  );

  const sendRequest = useCallback(() => {
    if (
      toolDb.userAccount.getAddress() &&
      state.groups[groupId] &&
      groupRoute
    ) {
      const address = toolDb.userAccount.getAddress() || "";

      // Check if we already asked to join this group
      if (checkIfWeJoined() === false) {
        joinRequests.current.SET(
          address,
          toolDb.userAccount.getUsername() || ""
        );

        toolDb.putCrdt(`requests-${groupId}`, joinRequests.current, false);

        const newGroups = _.uniq([
          ...state.groupsList,
          `${groupId}-${state.groups[groupId].name}`,
        ]);
        toolDb.putData<GroupsList>("groups", newGroups, true);
        dispatch({ type: "SET_ALL_GROUPS_LIST", groups: newGroups });
      }
    }
  }, [joinRequests.current, groupRoute, state]);

  let newChats: Message[] = [];

  // Process this group's messages, blend together into one feed
  const groupMessages = state.groups[groupId]?.messages || {};
  Object.keys(groupMessages).forEach((id) => {
    const arr = state.groups[groupId].messages[id].map((m) => {
      return {
        ...m,
        u: state.names[id],
      } as Message;
    });
    newChats = [...newChats, ...arr];
  });

  // Sort!
  newChats.sort((a, b) => a.t - b.t);

  return groupRoute && state.groups[groupId] ? (
    <>
      <div className="chat">
        <div className="chat-messages">
          {newChats.map((msg, i) => {
            return (
              <ChatMessage
                key={`chat-message-${i}`}
                index={i}
                message={msg}
                prevMessage={newChats[i - 1]}
              />
            );
          })}
        </div>
        <input
          className="chat-input"
          value={message}
          onChange={(e) => {
            setMessage(e.currentTarget.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              sendMessage(groupId, e.currentTarget.value);
              setMessage("");
            }
          }}
        />
      </div>
      <div className="members-list">
        <p>Members: </p>
        <div>
          {_.uniq(state.groups[groupId].members).map((id) => {
            return (
              <div className="group-member" key={`group-member-${id}`}>
                {state.names[id]}
                <i>{toolDb.userAccount.getAddress() === id ? "(you)" : ""}</i>
                <b>
                  {state.groups[groupId].owners.includes(id) ? " (admin)" : ""}
                </b>
              </div>
            );
          })}

          {areWeOwners() === true ? (
            <>
              <p>Join requests: </p>
              {Object.keys(joinRequests.current.value)
                .filter((id) => !state.groups[groupId].members.includes(id))
                .map((id) => {
                  const name = joinRequests.current.value[id];
                  return (
                    <div className="join-request" key={`join-request-${id}`}>
                      <span className="join-request-name">{name}</span>
                      <div className="join-request-actions">
                        <button
                          type="button"
                          className="btn-accept"
                          onClick={() => addMember(id)}
                          title="Accept request"
                        >
                          ✓
                        </button>
                        <button
                          type="button"
                          className="btn-deny"
                          onClick={() => denyRequest(id)}
                          title="Deny request"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
            </>
          ) : null}
          {areWeOwners() === false && checkIfWeJoined() === false ? (
            <button type="button" onClick={sendRequest}>
              Request join
            </button>
          ) : areWeOwners() === false ? (
            <p>
              <i>You already requested to join this group</i>
            </p>
          ) : null}
        </div>
      </div>
    </>
  ) : (
    <p>Select or create a group to start</p>
  );
}
