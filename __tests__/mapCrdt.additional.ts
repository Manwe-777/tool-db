import { MapCrdt } from "../packages/tool-db";

describe("MapCrdt - Additional Edge Cases", () => {
  it("Can handle empty map operations", () => {
    const Alice = new MapCrdt<number>("Alice");
    const Bob = new MapCrdt<number>("Bob");

    // Both start with empty maps
    expect(Alice.value).toEqual({});
    expect(Bob.value).toEqual({});

    // Merge empty changes
    Alice.mergeChanges(Bob.getChanges());
    Bob.mergeChanges(Alice.getChanges());

    expect(Alice.value).toEqual({});
    expect(Bob.value).toEqual({});
  });

  it("Can handle DEL on non-existent key", () => {
    const Alice = new MapCrdt<number>("Alice");
    const Bob = new MapCrdt<number>("Bob");

    Alice.DEL("nonExistent");
    Bob.mergeChanges(Alice.getChanges());

    expect(Alice.value).toEqual({});
    expect(Bob.value).toEqual({});
  });

  it("Can handle multiple SET on same key before merge", () => {
    const Alice = new MapCrdt<number>("Alice");
    const Bob = new MapCrdt<number>("Bob");

    Alice.SET("counter", 1);
    Alice.SET("counter", 2);
    Alice.SET("counter", 3);
    Alice.SET("counter", 4);

    Bob.mergeChanges(Alice.getChanges());

    expect(Alice.value).toEqual({ counter: 4 });
    expect(Bob.value).toEqual({ counter: 4 });
  });

  it("Can handle different data types", () => {
    const Alice = new MapCrdt<string | number | boolean>("Alice");
    const Bob = new MapCrdt<string | number | boolean>("Bob");

    Alice.SET("string", "hello");
    Alice.SET("number", 42);
    Alice.SET("boolean", true);

    // Check Alice has all three
    expect(Alice.value).toEqual({
      string: "hello",
      number: 42,
      boolean: true,
    });

    // Bob merges Alice's changes
    Bob.mergeChanges(Alice.getChanges());

    expect(Bob.value).toEqual({
      string: "hello",
      number: 42,
      boolean: true,
    });
  });

  it("Can handle SET after DEL on same key", () => {
    const Alice = new MapCrdt<number>("Alice");
    const Bob = new MapCrdt<number>("Bob");

    Alice.SET("key", 1);
    Bob.mergeChanges(Alice.getChanges());

    Alice.DEL("key");
    Alice.SET("key", 2);

    Bob.mergeChanges(Alice.getChanges());

    expect(Alice.value).toEqual({ key: 2 });
    expect(Bob.value).toEqual({ key: 2 });
  });

  it("Can handle multiple concurrent DEL operations", () => {
    const Alice = new MapCrdt<number>("Alice");
    const Bob = new MapCrdt<number>("Bob");
    const Chris = new MapCrdt<number>("Chris");

    Alice.SET("x", 1);
    Alice.SET("y", 2);
    Alice.SET("z", 3);

    Bob.mergeChanges(Alice.getChanges());
    Chris.mergeChanges(Alice.getChanges());

    // All try to delete different keys
    Alice.DEL("x");
    Bob.DEL("y");
    Chris.DEL("z");

    Alice.mergeChanges(Bob.getChanges());
    Alice.mergeChanges(Chris.getChanges());

    Bob.mergeChanges(Alice.getChanges());
    Bob.mergeChanges(Chris.getChanges());

    Chris.mergeChanges(Alice.getChanges());
    Chris.mergeChanges(Bob.getChanges());

    expect(Alice.value).toEqual({});
    expect(Bob.value).toEqual({});
    expect(Chris.value).toEqual({});
  });

  it("Can handle stress test with many operations", () => {
    const Alice = new MapCrdt<number>("Alice");

    // Alice performs many SET operations
    for (let i = 0; i < 100; i++) {
      Alice.SET(`key${i}`, i);
    }

    // Verify all 100 keys are present
    expect(Object.keys(Alice.value).length).toBe(100);
    for (let i = 0; i < 100; i++) {
      expect(Alice.value[`key${i}`]).toBe(i);
    }

    // Bob starts fresh and merges Alice's changes
    const Bob = new MapCrdt<number>("Bob", Alice.getChanges());

    // Bob should have all 100 keys
    expect(Object.keys(Bob.value).length).toBe(100);

    // Bob deletes half of them
    for (let i = 0; i < 50; i++) {
      Bob.DEL(`key${i}`);
    }

    // Bob should now have 50 keys
    expect(Object.keys(Bob.value).length).toBe(50);

    // Alice merges Bob's deletions
    Alice.mergeChanges(Bob.getChanges());

    // Alice should now also have 50 keys
    expect(Object.keys(Alice.value).length).toBe(50);

    // Verify remaining keys in both
    for (let i = 50; i < 100; i++) {
      expect(Alice.value[`key${i}`]).toBe(i);
      expect(Bob.value[`key${i}`]).toBe(i);
    }
  });

  it("Can handle complex concurrent SET/DEL scenarios", () => {
    const Alice = new MapCrdt<number>("Alice");
    const Bob = new MapCrdt<number>("Bob");
    const Chris = new MapCrdt<number>("Chris");

    Alice.SET("x", 1);
    Bob.SET("x", 2);
    Chris.DEL("x");

    Alice.mergeChanges(Bob.getChanges());
    Alice.mergeChanges(Chris.getChanges());

    Bob.mergeChanges(Alice.getChanges());
    Bob.mergeChanges(Chris.getChanges());

    Chris.mergeChanges(Alice.getChanges());
    Chris.mergeChanges(Bob.getChanges());

    // All should converge
    expect(Alice.value).toEqual(Bob.value);
    expect(Bob.value).toEqual(Chris.value);
  });

  it("Can handle idempotent merge operations", () => {
    const Alice = new MapCrdt<number>("Alice");
    const Bob = new MapCrdt<number>("Bob");

    Alice.SET("key", 1);

    // Merge same changes multiple times
    Bob.mergeChanges(Alice.getChanges());
    Bob.mergeChanges(Alice.getChanges());
    Bob.mergeChanges(Alice.getChanges());

    expect(Bob.value).toEqual({ key: 1 });

    // Verify changes array isn't duplicated
    expect(Bob.getChanges().length).toBe(1);
  });

  it("Can verify value getter is idempotent", () => {
    const Alice = new MapCrdt<number>("Alice");

    Alice.SET("key", 1);

    const value1 = Alice.value;
    const value2 = Alice.value;
    const value3 = Alice.value;

    expect(value1).toEqual(value2);
    expect(value2).toEqual(value3);
  });

  it("Can handle four-way concurrent conflict", () => {
    const Alice = new MapCrdt<string>("Alice");
    const Bob = new MapCrdt<string>("Bob");
    const Chris = new MapCrdt<string>("Chris");
    const Diana = new MapCrdt<string>("Diana");

    // All set same key to different values
    Alice.SET("winner", "Alice");
    Bob.SET("winner", "Bob");
    Chris.SET("winner", "Chris");
    Diana.SET("winner", "Diana");

    // Full mesh merge
    [Alice, Bob, Chris, Diana].forEach((node) => {
      node.mergeChanges(Alice.getChanges());
      node.mergeChanges(Bob.getChanges());
      node.mergeChanges(Chris.getChanges());
      node.mergeChanges(Diana.getChanges());
    });

    // All should have same value (deterministic)
    const winner = Alice.value.winner;
    expect(Bob.value.winner).toBe(winner);
    expect(Chris.value.winner).toBe(winner);
    expect(Diana.value.winner).toBe(winner);
  });

  it("Can handle SET, DEL, SET sequence with different authors", () => {
    const Alice = new MapCrdt<number>("Alice");
    const Bob = new MapCrdt<number>("Bob");

    Alice.SET("key", 1);
    Bob.mergeChanges(Alice.getChanges());

    Bob.DEL("key");
    Alice.mergeChanges(Bob.getChanges());

    Alice.SET("key", 2);
    Bob.mergeChanges(Alice.getChanges());

    expect(Alice.value).toEqual({ key: 2 });
    expect(Bob.value).toEqual({ key: 2 });
  });

  it("Can handle objects as values", () => {
    interface User {
      name: string;
      age: number;
    }

    const Alice = new MapCrdt<User>("Alice");
    const Bob = new MapCrdt<User>("Bob");

    Alice.SET("user1", { name: "Alice", age: 30 });
    Bob.SET("user2", { name: "Bob", age: 25 });

    Alice.mergeChanges(Bob.getChanges());
    Bob.mergeChanges(Alice.getChanges());

    expect(Alice.value).toEqual({
      user1: { name: "Alice", age: 30 },
      user2: { name: "Bob", age: 25 },
    });
    expect(Bob.value).toEqual({
      user1: { name: "Alice", age: 30 },
      user2: { name: "Bob", age: 25 },
    });
  });

  it("Can handle rapid alternating SET/DEL on same key", () => {
    const Alice = new MapCrdt<number>("Alice");
    const Bob = new MapCrdt<number>("Bob");

    for (let i = 0; i < 10; i++) {
      Alice.SET("toggle", i);
      Alice.DEL("toggle");
    }

    Bob.mergeChanges(Alice.getChanges());

    expect(Alice.value).toEqual({});
    expect(Bob.value).toEqual({});
  });

  it("Can handle partial sync with three nodes", () => {
    const Alice = new MapCrdt<number>("Alice");
    const Bob = new MapCrdt<number>("Bob");
    const Chris = new MapCrdt<number>("Chris");

    Alice.SET("a", 1);
    Bob.SET("b", 2);
    Chris.SET("c", 3);

    // Only partial sync
    Alice.mergeChanges(Bob.getChanges());
    Bob.mergeChanges(Chris.getChanges());

    // Alice doesn't know about Chris yet
    expect(Alice.value).toEqual({ a: 1, b: 2 });
    expect(Bob.value).toEqual({ b: 2, c: 3 });
    expect(Chris.value).toEqual({ c: 3 });

    // Complete sync
    Chris.mergeChanges(Alice.getChanges());
    Alice.mergeChanges(Chris.getChanges());

    expect(Alice.value).toEqual({ a: 1, b: 2, c: 3 });
    expect(Bob.value).toEqual({ b: 2, c: 3 });
    expect(Chris.value).toEqual({ a: 1, b: 2, c: 3 });
  });
});

