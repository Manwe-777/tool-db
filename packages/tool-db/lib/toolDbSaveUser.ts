import { ToolDb, ToolDbStorageAdapter } from ".";

/**
 * Save the current user account to local storage
 * This allows the user to persist across sessions
 */
export default async function toolDbSaveUser(this: ToolDb): Promise<void> {
  const DEFAULT_USER_KEYS = "%default-user%";
  
  const tempStore = new this.options.storageAdapter(
    this,
    "_____peer_" + this.options.storageName
  );

  const encrypted = await this.userAccount.encryptAccount(DEFAULT_USER_KEYS);
  await tempStore.put(DEFAULT_USER_KEYS, JSON.stringify(encrypted));
}

