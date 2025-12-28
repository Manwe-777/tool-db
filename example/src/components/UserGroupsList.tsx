import _ from "lodash";
import { useCallback, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { sha1 } from "tool-db";
import getToolDb from "../utils/getToolDb";
import {
  GroupData,
  GroupsList,
  WrappedGroupKeyData,
  GlobalState,
} from "../types";
import { AllActions } from "../state/actions";
import {
  generateGroupKey,
  wrapGroupKeyForMember,
  cacheGroupKey,
} from "../utils/groupCrypto";
import { getCurrentKeys } from "../utils/encryptionKeyManager";

interface GroupsListProps {
  groupsList: GroupsList;
  groups: GlobalState["groups"];
  dispatch: React.Dispatch<AllActions>;
}

export default function UserGroupsList(props: GroupsListProps) {
  const { groupsList, groups, dispatch } = props;
  const navigate = useNavigate();
  const location = useLocation();

  const [newGroupName, setNewGroupName] = useState("");

  const toolDb = getToolDb();

  // Extract groupRoute from the URL path since we're outside Routes scope
  const pathMatch = location.pathname.match(/^\/group\/(.+)$/);
  const groupRoute = pathMatch ? pathMatch[1] : "";
  const currentGroupId = decodeURIComponent(groupRoute);
  const userAddress = toolDb.userAccount.getAddress() || "";

  // Create a new group
  const createGroup = useCallback(async () => {
    // Use the group name and our pubkey to get the hash/id
    // The group id will be unique for us, in case someone else creates a new group with the same name
    const address = toolDb.userAccount.getAddress() || "";
    const groupId = sha1(newGroupName + new Date().getTime() + address);
    setNewGroupName("");

    // The key contains the name as well, for UI display without extra queries
    const newGroupKey = `${groupId}-${newGroupName}`;

    // Generate a new encryption key for this group
    const groupEncryptionKey = generateGroupKey();

    // Cache it locally so we can encrypt messages immediately
    cacheGroupKey(groupId, groupEncryptionKey);

    // Wrap the group key for ourselves (we're the first member)
    const ourKeys = getCurrentKeys();
    if (ourKeys) {
      // Get our own encryption public key (we should have it)
      const ourEncPubKey = ourKeys.publicKey;

      const wrappedKey = await wrapGroupKeyForMember(
        groupEncryptionKey,
        ourKeys.privateKey,
        ourEncPubKey
      );

      const wrappedKeyData: WrappedGroupKeyData = {
        ...wrappedKey,
        from: address, // We wrapped it
      };

      // Store the wrapped group key for ourselves
      toolDb.putData<WrappedGroupKeyData>(
        `groupKey-${groupId}-${address}`,
        wrappedKeyData
      );
    }

    // Use the frozen namespace for the metadata
    toolDb
      .putData<GroupData>(`==${groupId}`, {
        owners: [address],
        name: newGroupName,
        id: groupId,
        members: [address],
      })
      .then((d) => {
        if (d) {
          // add this group key to our index!
          const newGroups = _.uniq([...groupsList, newGroupKey]);
          toolDb.putData<GroupsList>("groups", newGroups, true);
        }
      });
  }, [groupsList, newGroupName]);

  // Change the current group, trigger everything
  const changeGroup = useCallback(
    (groupId: string) => {
      navigate(`/group/${encodeURIComponent(groupId)}`);
    },
    [newGroupName, dispatch]
  );

  return (
    <div className="groups-list">
      <p>Groups: </p>
      {groupsList.map((name) => {
        const groupId = name.split("-")[0];
        const groupName = name.split("-")[1];
        const isActive = groupId === currentGroupId;
        // Only consider pending if group data has loaded and we're not in members
        const groupDataLoaded = groups[groupId] !== undefined;
        const isMember =
          groups[groupId]?.members.includes(userAddress) || false;
        const isPending = groupDataLoaded && !isMember;

        return (
          <div
            className={`group-name${isActive ? " active" : ""}${
              isPending ? " pending" : ""
            }`}
            key={`group-name-${name}`}
            onClick={isActive ? undefined : () => changeGroup(groupId)}
            style={{ cursor: isActive ? "default" : "pointer" }}
          >
            {groupName}
            {isPending && <span className="pending-badge">pending</span>}
          </div>
        );
      })}
      <div>
        <input
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.currentTarget.value)}
        />
        <button type="button" onClick={createGroup}>
          Create
        </button>
      </div>
    </div>
  );
}
