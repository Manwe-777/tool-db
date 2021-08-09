import localforage from "localforage";

export default function localForageWrite(
  key: string,
  value: any
): Promise<undefined> {
  return localforage.setItem(key, value);
}
