import React from "react";

import { AllActions } from "../state/actions";
import { GroupData, GroupsList } from "../types";
import getToolDb from "../utils/getToolDb";

export default function setupTooldb(dispatch: React.Dispatch<AllActions>) {
  const toolDb = getToolDb();
  const selfAddress = toolDb.userAccount.getAddress() || "";

  // Maintain a little state here aside from the component
  const wrappedGroups: string[] = [];

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

      // Listen for messages of this member
      const userGroupKey = `:${memberAddress}.group-${groupData.id}`;
      toolDb.subscribeData(userGroupKey);
      toolDb.getData(userGroupKey);
    });
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
      dispatch({
        type: "SET_USER_GROUP_MESSAGES",
        userId: owner,
        groupId: key.slice(6),
        messages: data.v,
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

    // :{address}.name
    if (key === "pubKey") {
      dispatch({
        type: "SET_USER_PUBKEY",
        userId: owner,
        pubKey: data.v,
      });
    }
  });

  toolDb.subscribeData("groups", true);
  toolDb.getData<GroupsList>("groups", true);
}
