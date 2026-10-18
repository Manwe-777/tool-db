/**
 * A set that only remembers the latest `maxSize` items it was given,
 * forgetting the oldest ones first. Used to deduplicate network messages
 * without growing forever.
 */
export default class BoundedSet<T> {
  private _items = new Set<T>();

  private _maxSize: number;

  constructor(maxSize: number) {
    this._maxSize = maxSize;
  }

  get size() {
    return this._items.size;
  }

  public has(item: T) {
    return this._items.has(item);
  }

  public add(item: T) {
    if (this._items.has(item)) return;

    this._items.add(item);
    // Sets iterate in insertion order, so the first item is the oldest
    if (this._items.size > this._maxSize) {
      this._items.delete(this._items.values().next().value as T);
    }
  }
}
