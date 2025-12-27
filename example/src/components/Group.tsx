/* eslint-disable no-nested-ternary */
/* eslint-disable react/no-array-index-key */
import _ from "lodash";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

import { MapCrdt, MapChanges } from "tool-db";

import ChatMessage from "./ChatMessage";
import getToolDb from "../utils/getToolDb";
import { GroupData, GlobalState, GroupsList, Message } from "../types";
import { AllActions } from "../state/actions";

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
    (id: string) => {
      if (
        state.groups[groupId] &&
        groupRoute &&
        !state.groups[groupId].members.includes(id)
      ) {
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
      }
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
                    <div
                      className="group-member"
                      key={`join-request-${id}`}
                      onClick={() => addMember(id)}
                    >
                      {name}
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
