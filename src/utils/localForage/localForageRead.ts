import localforage from "localforage";

export default function localForageRead<T>(key: string): Promise<T | null> {
  return localforage.getItem(key);
}
