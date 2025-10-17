import { ListCrdt } from "../packages/tool-db";

describe("ListCrdt - Additional Edge Cases", () => {
  it("Can handle empty list operations", () => {
    const Alice = new ListCrdt<string>("Alice");
    const Bob = new ListCrdt<string>("Bob");

    expect(Alice.value).toEqual([]);
    expect(Bob.value).toEqual([]);

    Alice.mergeChanges(Bob.getChanges());
    Bob.mergeChanges(Alice.getChanges());

    expect(Alice.value).toEqual([]);
    expect(Bob.value).toEqual([]);
  });

  it("Can handle PUSH on empty list", () => {
    const Alice = new ListCrdt<string>("Alice");

    Alice.PUSH("first");

    expect(Alice.value).toEqual(["first"]);

    Alice.PUSH("second");

    expect(Alice.value).toEqual(["first", "second"]);
  });

  it("Can handle INS at beginning of empty list", () => {
    const Alice = new ListCrdt<string>("Alice");

    Alice.INS("first", 0);

    expect(Alice.value).toEqual(["first"]);
  });

  it("Can handle multiple concurrent PUSHes", () => {
    const Alice = new ListCrdt<string>("Alice");
    const Bob = new ListCrdt<string>("Bob");
    const Chris = new ListCrdt<string>("Chris");

    Alice.PUSH("A");
    Bob.PUSH("B");
    Chris.PUSH("C");

    Alice.mergeChanges(Bob.getChanges());
    Alice.mergeChanges(Chris.getChanges());

    Bob.mergeChanges(Alice.getChanges());
    Bob.mergeChanges(Chris.getChanges());

    Chris.mergeChanges(Alice.getChanges());
    Chris.mergeChanges(Bob.getChanges());

    // All should have same length
    expect(Alice.value.length).toBe(3);
    expect(Bob.value.length).toBe(3);
    expect(Chris.value.length).toBe(3);

    // All should converge to same value
    expect(Alice.value).toEqual(Bob.value);
    expect(Bob.value).toEqual(Chris.value);
  });

  it("Can handle concurrent inserts at same position", () => {
    const Alice = new ListCrdt<string>("Alice");
    const Bob = new ListCrdt<string>("Bob");

    Alice.PUSH("a");
    Alice.PUSH("c");

    Bob.mergeChanges(Alice.getChanges());

    // Both insert at position 1 (between 'a' and 'c')
    Alice.INS("b1", 1);
    Bob.INS("b2", 1);

    Alice.mergeChanges(Bob.getChanges());
    Bob.mergeChanges(Alice.getChanges());

    // Should converge
    expect(Alice.value).toEqual(Bob.value);
    expect(Alice.value.length).toBe(4);
  });

  it("Can handle multiple deletes", () => {
    const Alice = new ListCrdt<string>("Alice");
    const Bob = new ListCrdt<string>("Bob");

    Alice.PUSH("a");
    Alice.PUSH("b");
    Alice.PUSH("c");
    Alice.PUSH("d");
    Alice.PUSH("e");

    Bob.mergeChanges(Alice.getChanges());

    expect(Bob.value.join("")).toEqual("abcde");

    // Delete from both ends
    Bob.DEL(0); // Delete 'a'
    Bob.DEL(3); // Delete 'e'

    expect(Bob.value.join("")).toEqual("bcd");

    Alice.mergeChanges(Bob.getChanges());

    expect(Alice.value.join("")).toEqual("bcd");
  });

  it("Can handle delete then insert at same position", () => {
    const Alice = new ListCrdt<string>("Alice");

    Alice.PUSH("a");
    Alice.PUSH("b");
    Alice.PUSH("c");

    expect(Alice.value.join("")).toEqual("abc");

    Alice.DEL(1); // Delete 'b'

    expect(Alice.value.join("")).toEqual("ac");

    Alice.INS("x", 1); // Insert 'x' where 'b' was

    expect(Alice.value.join("")).toEqual("axc");
  });

  it("Can handle concurrent delete of same element", () => {
    const Alice = new ListCrdt<string>("Alice");
    const Bob = new ListCrdt<string>("Bob");

    Alice.PUSH("a");
    Alice.PUSH("b");
    Alice.PUSH("c");

    Bob.mergeChanges(Alice.getChanges());

    // Both try to delete 'b' (index 1)
    Alice.DEL(1);
    Bob.DEL(1);

    Alice.mergeChanges(Bob.getChanges());
    Bob.mergeChanges(Alice.getChanges());

    expect(Alice.value.join("")).toEqual("ac");
    expect(Bob.value.join("")).toEqual("ac");
  });

  it("Can handle insert after delete from different peers", () => {
    const Alice = new ListCrdt<string>("Alice");
    const Bob = new ListCrdt<string>("Bob");

    Alice.PUSH("a");
    Alice.PUSH("b");
    Alice.PUSH("c");

    Bob.mergeChanges(Alice.getChanges());

    Alice.DEL(1); // Alice deletes 'b'
    Bob.INS("x", 1); // Bob inserts 'x' before 'b'

    Alice.mergeChanges(Bob.getChanges());
    Bob.mergeChanges(Alice.getChanges());

    // Should converge
    expect(Alice.value).toEqual(Bob.value);
  });

  it("Can handle building a list collaboratively", () => {
    const Alice = new ListCrdt<number>("Alice");
    const Bob = new ListCrdt<number>("Bob");

    // Alice adds odd numbers
    Alice.PUSH(1);
    Alice.PUSH(3);
    Alice.PUSH(5);

    // Bob adds even numbers
    Bob.PUSH(2);
    Bob.PUSH(4);
    Bob.PUSH(6);

    Alice.mergeChanges(Bob.getChanges());
    Bob.mergeChanges(Alice.getChanges());

    // Should have all numbers
    expect(Alice.value.length).toBe(6);
    expect(Bob.value.length).toBe(6);

    // Should be same
    expect(Alice.value).toEqual(Bob.value);
  });

  it("Can handle stress test with many insertions", () => {
    const Alice = new ListCrdt<number>("Alice");
    const Bob = new ListCrdt<number>("Bob");

    for (let i = 0; i < 50; i++) {
      Alice.PUSH(i);
    }

    Bob.mergeChanges(Alice.getChanges());

    expect(Bob.value.length).toBe(50);

    for (let i = 0; i < 50; i++) {
      expect(Bob.value[i]).toBe(i);
    }
  });

  it("Can handle complex insertion pattern", () => {
    const Alice = new ListCrdt<string>("Alice");

    Alice.PUSH("a");
    Alice.PUSH("e");

    Alice.INS("c", 1);
    Alice.INS("b", 1);
    Alice.INS("d", 3);

    expect(Alice.value.join("")).toEqual("abcde");
  });

  it("Can handle delete all elements", () => {
    const Alice = new ListCrdt<string>("Alice");
    const Bob = new ListCrdt<string>("Bob");

    Alice.PUSH("a");
    Alice.PUSH("b");
    Alice.PUSH("c");

    Bob.mergeChanges(Alice.getChanges());

    // Delete all from end to beginning
    Bob.DEL(2);
    Bob.DEL(1);
    Bob.DEL(0);

    expect(Bob.value).toEqual([]);

    Alice.mergeChanges(Bob.getChanges());

    expect(Alice.value).toEqual([]);
  });

  it("Can handle interleaved operations", () => {
    const Alice = new ListCrdt<string>("Alice");
    const Bob = new ListCrdt<string>("Bob");

    Alice.PUSH("1");
    Bob.mergeChanges(Alice.getChanges());

    Bob.PUSH("2");
    Alice.mergeChanges(Bob.getChanges());

    Alice.PUSH("3");
    Bob.mergeChanges(Alice.getChanges());

    Bob.PUSH("4");
    Alice.mergeChanges(Bob.getChanges());

    // Both should have same values and converge
    expect(Alice.value.length).toBe(4);
    expect(Bob.value.length).toBe(4);
    expect(Alice.value).toEqual(Bob.value);
  });

  it("Can handle initialization from changes", () => {
    const Alice = new ListCrdt<string>("Alice");

    Alice.PUSH("a");
    Alice.PUSH("b");
    Alice.PUSH("c");

    const Bob = new ListCrdt<string>("Bob", Alice.getChanges());

    expect(Bob.value.join("")).toEqual("abc");
  });

  it("Can handle tombstone persistence", () => {
    const Alice = new ListCrdt<string>("Alice");
    const Bob = new ListCrdt<string>("Bob");

    Alice.PUSH("a");
    Alice.PUSH("b");
    Alice.PUSH("c");

    Bob.mergeChanges(Alice.getChanges());

    Alice.DEL(1); // Delete 'b'
    Bob.mergeChanges(Alice.getChanges());

    expect(Bob.value.join("")).toEqual("ac");

    // Even though 'b' is deleted, its tombstone should still be tracked
    expect(Bob._tempValues.length).toBe(3);
    expect(Bob._tempValues[1].tomb).toBe(true);
  });

  it("Can handle four-way collaborative editing", () => {
    const Alice = new ListCrdt<string>("Alice");
    const Bob = new ListCrdt<string>("Bob");
    const Chris = new ListCrdt<string>("Chris");
    const Diana = new ListCrdt<string>("Diana");

    // Each adds their own letter
    Alice.PUSH("A");
    Bob.PUSH("B");
    Chris.PUSH("C");
    Diana.PUSH("D");

    // Full mesh sync
    const nodes = [Alice, Bob, Chris, Diana];
    nodes.forEach((node) => {
      nodes.forEach((other) => {
        if (node !== other) {
          node.mergeChanges(other.getChanges());
        }
      });
    });

    // All should have same length
    expect(Alice.value.length).toBe(4);
    expect(Bob.value.length).toBe(4);
    expect(Chris.value.length).toBe(4);
    expect(Diana.value.length).toBe(4);

    // All should converge
    expect(Alice.value).toEqual(Bob.value);
    expect(Bob.value).toEqual(Chris.value);
    expect(Chris.value).toEqual(Diana.value);
  });

  it("Can handle mixed PUSH and INS operations", () => {
    const Alice = new ListCrdt<number>("Alice");

    Alice.PUSH(1);
    Alice.PUSH(2);
    Alice.PUSH(4);
    Alice.PUSH(5);

    Alice.INS(3, 2);

    expect(Alice.value).toEqual([1, 2, 3, 4, 5]);
  });

  it("Can verify idempotent value getter", () => {
    const Alice = new ListCrdt<string>("Alice");

    Alice.PUSH("a");
    Alice.PUSH("b");

    const value1 = Alice.value;
    const value2 = Alice.value;
    const value3 = Alice.value;

    expect(value1).toEqual(value2);
    expect(value2).toEqual(value3);
  });

  it("Can handle idempotent merge operations", () => {
    const Alice = new ListCrdt<string>("Alice");
    const Bob = new ListCrdt<string>("Bob");

    Alice.PUSH("a");
    Alice.PUSH("b");

    // Merge same changes multiple times
    Bob.mergeChanges(Alice.getChanges());
    Bob.mergeChanges(Alice.getChanges());
    Bob.mergeChanges(Alice.getChanges());

    expect(Bob.value.join("")).toEqual("ab");
  });
});

