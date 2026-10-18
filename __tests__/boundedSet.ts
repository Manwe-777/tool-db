import { BoundedSet } from "../packages/tool-db";

it("Remembers only the latest items", () => {
  const set = new BoundedSet<string>(3);
  ["a", "b", "c", "d"].forEach((item) => set.add(item));

  expect(set.size).toBe(3);
  expect(set.has("a")).toBeFalsy();
  expect(set.has("b")).toBeTruthy();
  expect(set.has("d")).toBeTruthy();
});

it("Does not evict when adding an existing item", () => {
  const set = new BoundedSet<string>(2);
  set.add("a");
  set.add("b");
  set.add("a");

  expect(set.size).toBe(2);
  expect(set.has("a")).toBeTruthy();
  expect(set.has("b")).toBeTruthy();
});
